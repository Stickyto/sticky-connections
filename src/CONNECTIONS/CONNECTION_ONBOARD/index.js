const path = require('path')
const dns = require('dns').promises
const net = require('net')
const puppeteer = require('puppeteer')
const { Vibrant } = require('node-vibrant/node')
const { assert, uuid } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')

const BUCKET_NAME = 'sticky-uploads'
const { Storage } = require('@google-cloud/storage')
const storage = new Storage({
  projectId: process.env.GOOGLE_PROJECT_ID
})

const uploadBuffer = async ({
  bucket,
  buffer,
  extension = 'png',
  mimetype = 'image/png'
}) => {
  assert(bucket, 'no bucket')
  assert(buffer, 'no buffer')

  const id = uuid()
  const filename = `${id}.${extension}`

  const file = storage.bucket(bucket).file(filename)

  await file.save(
    buffer,
    {
      resumable: false,
      metadata: {
        contentType: mimetype
      }
    }
  )

  return `https://storage.googleapis.com/${bucket}/${filename}`
}

function isBlockedIp (ip) {
  // ip is a string from dns.lookup (v4 or v6)
  const family = net.isIP(ip)
  if (!family) return true

  if (family === 4) {
    const parts = ip.split('.').map(n => Number(n))
    if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true

    const [a, b] = parts

    // loopback 127.0.0.0/8
    if (a === 127) return true

    // private 10.0.0.0/8
    if (a === 10) return true

    // private 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true

    // private 192.168.0.0/16
    if (a === 192 && b === 168) return true

    // link-local 169.254.0.0/16 (includes cloud metadata IP 169.254.169.254)
    if (a === 169 && b === 254) return true

    // "this network" 0.0.0.0/8
    if (a === 0) return true

    return false
  }

  // IPv6 blocks (string-prefix checks are OK here as a first pass)
  const v6 = ip.toLowerCase()

  // loopback ::1
  if (v6 === '::1') return true

  // link-local fe80::/10
  if (v6.startsWith('fe80:')) return true

  // unique local fc00::/7 (includes fd00::/8)
  if (v6.startsWith('fc') || v6.startsWith('fd')) return true

  // unspecified ::
  if (v6 === '::') return true

  return false
}

async function validatePublicHttpsUrl (input) {
  assert(typeof input === 'string', 'url must be a string')
  assert(input.length <= 2048, 'url too long')
  assert(!/\s/.test(input), 'url must not contain whitespace')

  // Basic format rule: must start with https:// and then a letter
  assert(/^https:\/\//i.test(input), 'url must start with https://')
  assert(/^https:\/\/[A-Za-z]/.test(input), 'url must have a letter after https://')

  let parsed
  try {
    parsed = new URL(input)
  } catch {
    assert(false, 'invalid url')
  }

  assert(parsed.protocol === 'https:', 'only https is allowed')

  // Prevent https://user:pass@host tricks
  assert(parsed.username === '' && parsed.password === '', 'userinfo not allowed')

  // Hostname rules
  const hostname = parsed.hostname

  // must contain a dot
  assert(hostname.includes('.'), 'hostname must contain a dot')

  // ensure hostname starts with a letter (not a number)
  assert(/^[A-Za-z]/.test(hostname), 'hostname must start with a letter')

  // Disallow obvious local hostnames
  const hn = hostname.toLowerCase()
  assert(hn !== 'localhost', 'localhost not allowed')
  assert(!hn.endsWith('.local'), '.local hostnames not allowed')

  // Resolve DNS and block internal/private destinations
  const lookup = await dns.lookup(hostname, { all: true, verbatim: true })
  assert(Array.isArray(lookup) && lookup.length > 0, 'dns lookup failed')

  for (const r of lookup) {
    assert(!isBlockedIp(r.address), `blocked ip: ${r.address}`)
  }

  return parsed.toString()
}

const extensionPath = path.resolve(__dirname, './extensions/I-Still-Dont-Care-About-Cookies')

console.warn('xxx extensionPath', extensionPath)

module.exports = new Connection({
  id: 'CONNECTION_ONBOARD',
  name: 'Onboard',
  color: '#9F89AE',
  logo: cdn => `${cdn}/connections/CONNECTION_AI_SIMULATOR.png`,
  configNames: [],
  configDefaults: [],
  methods: {
    onboard: {
      name: 'Onboard',
      logic: async ({ connectionContainer, config, body }) => {
        const { url } = body
        const finalUrl = await validatePublicHttpsUrl(url)

        const browser = await puppeteer.launch({
          headless: false,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`
          ]
        })

        const page = await browser.newPage()

        await page.setViewport({
          width: 1280,
          height: 1024,
          deviceScaleFactor: 2
        })

        await page.goto(
          finalUrl,
          {
            waitUntil: 'networkidle2',
            timeout: 10 * 1000
          }
        )

        await page.evaluate(() => window.scrollTo(0, 0))

        const name = await page.evaluate(() => {
          const og = document.querySelector('meta[property="og:site_name"]')
          if (og && og.content) return og.content.trim()

          const title = document.querySelector('title')
          if (title) return title.innerText.split('|')[0].trim()

          return null
        })

        const logoUrl = await (async () => {
          const handle = await page.evaluateHandle(() => {
            const homepageLinks = [...document.querySelectorAll('a')]
              .filter(a => a.href === window.location.href)

            if (homepageLinks.length) return homepageLinks[0]

            const logoImg = [...document.images]
              .find(img => img.src.toLowerCase().includes('logo'))

            if (logoImg) return logoImg

            const topImg = [...document.images]
              .find(img => {
                const rect = img.getBoundingClientRect()
                return rect.top < 300 && rect.width > 40 && rect.height > 20
              })

            if (topImg) return topImg
          })

          const element = handle?.asElement()
          if (!element) return

          const raw = await element.screenshot({ type: 'png' })
          const buffer = Buffer.from(raw)

          const logoUrl = await uploadBuffer({
            bucket: BUCKET_NAME,
            buffer,
            extension: 'png',
            mimetype: 'image/png'
          })

          return logoUrl
        })()

        const wholePageRaw = await page.screenshot()
        const wholePageBuffer = Buffer.from(wholePageRaw)

        const wholePageUrl = await uploadBuffer({
          bucket: BUCKET_NAME,
          buffer: wholePageBuffer,
          extension: 'png',
          mimetype: 'image/png'
        })

        const colors = await (async () => {
          const palette = await Vibrant.from(wholePageBuffer).getPalette()
          return Object
            .values(palette)
            .filter(Boolean)
            .sort((a, b) => b.population - a.population)
            .slice(0, 10)
            .map(p => p.hex)
        })()

        await browser.close()

        return {
          name,
          logoUrl,
          wholePageUrl,
          colors
        }
      }
    }
  }
})
