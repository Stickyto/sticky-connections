const crypto = require('crypto')
const Connection = require('../Connection')

const ITEMS_DELIMITER = ';'
const ALGORITHM = 'sha512'
const IGNORE_KEYS = ['frame_mode', 'signature']

function generateSignature (payload, secretKey) {
  const flat = flatten(payload)
  delete flat.signature
  const entries = Object.entries(flat)
    .sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }))
  const theString = entries.map(([k, v]) => `${k}:${v}`).join(ITEMS_DELIMITER)
  const theHmac = crypto.createHmac(ALGORITHM, secretKey)
    .update(Buffer.from(theString, 'utf8'))
    .digest()
  return Buffer.from(theHmac).toString('base64')
}

function flatten (obj, prefix = '', res = {}) {
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue
    if (IGNORE_KEYS.includes(key)) continue
    const val = obj[key]
    const path = prefix ? `${prefix}:${key}` : key
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      flatten(val, path, res)
    } else {
      res[path] = typeof val === 'boolean' ? (val ? '1' : '0') : String(val)
    }
  }
  return res
}

async function makeRequest (url, payload, secretKey) {
  global.rdic.logger.log({}, '[CONNECTION_ECOMMPAY] [makeRequest]', { url, payload })
  payload.general.signature = generateSignature(payload, secretKey)
  const res = await fetch(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    }
  )
  const asJson = await res.json()
  global.rdic.logger.log({}, '[CONNECTION_ECOMMPAY] [makeRequest]', { asJson })
  return asJson
}

module.exports = new Connection({
  id: 'CONNECTION_ECOMMPAY',
  name: 'Ecommpay',
  color: '#000000',
  logo: cdn => `${cdn}/connections/CONNECTION_ECOMMPAY.svg`,
  configNames: ['Project ID', 'Secret key'],
  configDefaults: ['', ''],
  methods: {
    'private--oct-done': {
      name: 'OCT -> Done',
      logic: async calledWith => {

      }
    },
    'oct': {
      name: 'OCT',
      logic: async calledWith => {
        let { config: [projectId, secretKey] } = calledWith
        projectId = parseInt(projectId, 10)

        const { body: { total, eventId, eventIp, vaultItem }, connectionContainer: { rdic, user } } = calledWith
        const { apiUrl } = rdic.get('environment')

        const payload = {
          general: {
            project_id: projectId,
            payment_id: eventId,
            merchant_callback_url: `${apiUrl}/v2/connectionhook/${user.privateKey}/CONNECTION_ECOMMPAY/private--oct-done`
          },
          card: {
            "pan": vaultItem.number,
            "year": parseInt(`${new Date().getFullYear().toString().substring(0, 2)}${parseInt(vaultItem.expires.split('/')[1])}`, 10),
            "month": parseInt(vaultItem.expires.split('/')[0], 10),
            "card_holder": vaultItem.name
          },
          payment: {
            amount: total,
            currency: user.currency,
            description: 'Payout'
          },
          customer: {
            id: user.id,
            email: user.email,
            ip_address: eventIp
          }
        }

        const r = await makeRequest('https://api.ecommpay.com/v2/payment/card/payout', payload, secretKey)

        return {}
      }
    }
  }
})
