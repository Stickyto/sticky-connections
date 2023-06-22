const got = require('got')
const { assert, isEmailValid, getNow } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')

const COLOR = '#FFBD00'

async function makeRequest (config, url) {
  const [apiKey, email] = config
  const { body: bodyAsString } = await got(
    `https://business.untappd.com/api/${url}`,
    {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${email}:${apiKey}`).toString('base64')
      }
    }
  )
  return JSON.parse(bodyAsString)
}

async function getLocations (config) {
  global.rdic.logger.log({}, '[job-CONNECTION_UNTAPPD] [getLocations]')
  const data = await makeRequest(config, 'v1/locations')
  return data.locations
}

async function getMenus (config, locationId) {
  global.rdic.logger.log({}, '[job-CONNECTION_UNTAPPD] [getMenus]', { locationId })
  const data = await makeRequest(config, `v1/locations/${locationId}/menus`)
  return data.menus
}

async function getMenu (config, menuId) {
  global.rdic.logger.log({}, '[job-CONNECTION_UNTAPPD] [getMenu]', { menuId })
  const data = await makeRequest(config, `v1/menus/${menuId}?full=true`)
  return data.menu
}

module.exports = new Connection({
  id: 'CONNECTION_UNTAPPD',
  name: 'Untappd',
  shortName: 'U',
  color: COLOR,
  logo: cdn => `${cdn}/connections/CONNECTION_UNTAPPD.svg`,
  configNames: ['API key', 'Email', 'Venue ID'],
  configDefaults: ['', '', ''],
  instructions: [
    {
      'id': '71d05208-3781-4c24-996e-c4c0d1c6b228',
      'config': {
        'what': 'Sticky syncs with Untappd every 5 minutes.',
        'font': `${COLOR}--center--100%--false`,
        'icon': 'hand'
      }
    }
  ],
  crons: [
    {
      id: 'generic',
      frequency: '*/5 * * * *',
      logic: async function (user, cronContainer) {
        let nextIP = 0
        let nextIPc = 0
        const { rdic } = cronContainer
        global.rdic.logger.log({}, '[job-CONNECTION_UNTAPPD] [go]', { userId: user.id })

        try {
          const { config } = user.connections.find(c => c.id === 'CONNECTION_UNTAPPD')
          let [configApiKey, configEmail, configLocationId] = config

          assert(typeof configApiKey === 'string' && configApiKey.length > 0, 'You have not set an API key.')
          assert(isEmailValid(configEmail), 'You have not set a valid email.')
          assert(typeof configLocationId === 'string' && configLocationId.length > 0, 'You have not set a location ID.')
          assert(configLocationId.match(/^[0-9]+$/) ? true : false, 'The location ID must be a number.')

          const locations = await getLocations(config)
          const currentLocation = await locations.find(l => l.untappd_venue_id.toString() === configLocationId)
          assert(typeof currentLocation === 'object', `Could not find a location with ID ${configLocationId}.`)
          configLocationId = parseInt(configLocationId, 10)

          const allPcsToday = await cronContainer.getProductCategories(rdic, user, { connection: 'CONNECTION_UNTAPPD' })
          const allPsToday = await cronContainer.getProducts(rdic, user, { connection: 'CONNECTION_UNTAPPD' })

          const menus = await getMenus(config, currentLocation.id)

          let handledPcs = [], handledPs = []
          for (let menuI = 0; menuI < menus.length; menuI++) {
            const menu = await getMenu(config, menus[menuI].id)
            for (let menuSectionI = 0; menuSectionI < menu.sections.length; menuSectionI++) {
              const menuSection = menu.sections[menuSectionI]
              const pcName = `${menu.name} → ${menuSection.name}`
              const theirId = `${menu.id}--${menuSection.id}`
              let foundExistingPc = allPcsToday.find(maybeExistingPc => maybeExistingPc.theirId === theirId)
              global.rdic.logger.log({}, '[job-CONNECTION_UNTAPPD] [go]', pcName)

              const localPids = []
              for (let productIndex = 0; productIndex < menuSection.items.length; productIndex++) {
                const p = menuSection.items[productIndex]
                const theirId = p.id.toString()
                let foundExistingP = allPsToday.find(maybeExistingP => {
                  return maybeExistingP.theirId === theirId
                })
                global.rdic.logger.log({}, `[job-CONNECTION_UNTAPPD] [go]       -> ${p.name} (theirId=${theirId})`)
                const isAlcohol = parseFloat(p.abv) >= 1
                const isGlutenFree = (
                  typeof p.description === 'string' &&
                  (
                    p.description.toLowerCase().includes('gluten free') ||
                    p.description.toLowerCase().includes('gluten-free')
                  )
                )
                const isVegan = (
                  typeof p.description === 'string' &&
                  (
                    p.description.toLowerCase().includes('suitable for vegans')
                  )
                )
                const pCategories = []
                isAlcohol && pCategories.push('wet--alcohol')
                !isAlcohol && pCategories.push('wet--soft')
                isGlutenFree && pCategories.push('gluten-free')
                isVegan && pCategories.push('vegan')
                const pName = p.name
                const pDescription = [
                  p.containers.length > 0 && `Size: ${p.containers[0].container_size.name}`,
                  p.style && `Style: ${p.style}`,
                  p.brewery_location && `Brewery location: ${p.brewery_location}`,
                  `ABV: ${p.abv}`,
                  p.description.trim()
                ]
                  .filter(e => e)
                  .join('\n\n')
                const price = p.containers.length > 0 && p.containers[0].price !== null ? parseInt(parseFloat(p.containers[0].price) * 100, 10) : 0
                if (foundExistingP) {
                  foundExistingP.name = pName
                  foundExistingP.description = pDescription
                  foundExistingP.categories.patch(pCategories)
                  foundExistingP.price = price
                  await cronContainer.updateProduct(foundExistingP)
                  handledPs.push(foundExistingP.id)
                } else {
                  const payload = {
                    name: pName,
                    price,
                    userId: user.id,
                    media: [
                      {
                        type: 'image',
                        url: p.label_image_hd
                      }
                    ],
                    categories: pCategories,
                    theirId,
                    description: pDescription,
                    createdAt: getNow() + nextIP,
                    connection: 'CONNECTION_UNTAPPD'
                  }
                  foundExistingP = await cronContainer.createProduct(payload)
                  nextIP++
                }
                localPids.push(foundExistingP.id)
              }

              const isEnabled = !menu.draft && !menu.unpublished && menuSection.public
              if (foundExistingPc) {
                foundExistingPc.name = pcName
                foundExistingPc.description = menuSection.description || menu.description
                foundExistingPc.products.clear()
                foundExistingPc.view = 'grid-name'
                foundExistingPc.isEnabled = isEnabled
                localPids.forEach(pid => foundExistingPc.products.add(pid))
                await cronContainer.updateProductCategory(foundExistingPc)
                handledPcs.push(foundExistingPc.id)
              } else {
                foundExistingPc = await cronContainer.createProductCategory(
                  {
                    name: pcName,
                    userId: user.id,
                    theirId,
                    description: menuSection.description,
                    createdAt: getNow() + nextIPc,
                    connection: 'CONNECTION_UNTAPPD',
                    products: localPids,
                    view: 'grid-name',
                    isEnabled
                  },
                  user
                )
                nextIPc++
              }
            }
          }

          const toDeletePcPromises = allPcsToday
            .filter(pc => !handledPcs.includes(pc.id))
            .map(pc => rdic.get('datalayerRelational').deleteOne('product_categories', pc.id))
          global.rdic.logger.log({}, '[job-CONNECTION_UNTAPPD] handledPcs', handledPcs)
          global.rdic.logger.log({}, '[job-CONNECTION_UNTAPPD] toDeletePcPromises.length', toDeletePcPromises.length)
          await Promise.all(toDeletePcPromises)

          const toDeletePPromises = allPsToday
            .filter(p => !handledPs.includes(p.id))
            .map(async p => {
              await rdic.get('datalayerRelational').deleteOne('products', p.id)
              await rdic.get('datalayerRelational')._.sql(`UPDATE things SET product_id=NULL WHERE product_id='${p.id}' AND user_id='${user.id}'`)
            })
          global.rdic.logger.log({}, '[job-CONNECTION_UNTAPPD] handledPs.length', handledPs.length)
          global.rdic.logger.log({}, '[job-CONNECTION_UNTAPPD] toDeletePPromises.length', toDeletePPromises.length)
          await Promise.all(toDeletePPromises)

        } catch (e) {
          const payload = {
            type: 'CONNECTION_BAD',
            userId: user.id,
            customData: { id: 'CONNECTION_UNTAPPD', message: e.message }
          }
          await cronContainer.createEvent(payload)

          global.rdic.logger.error({}, e.message)
          throw e
        }
      }
    }
  ]
})
