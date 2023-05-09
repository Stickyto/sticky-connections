/* eslint-disable max-len */
/* eslint-disable quotes */
const Connection = require('../Connection')
const importMenu = require('./importMenu')
const { assert, isUrl } = require('openbox-node-utils')
const { Product, ProductCategory } = require('openbox-entities')

module.exports = new Connection({
  id: 'CONNECTION_JUSTEAT',
  name: 'Just Eat',
  color: '#FF8001',
  logo: cdn => `${cdn}/connections/CONNECTION_JUSTEAT.svg`,
  logoInverted: cdn => `${cdn}/connections/CONNECTION_JUSTEAT_WHITE.svg`,
  configNames: ['URL'],
  configDefaults: [''],
  userIds: ['32027163-655c-4881-9bba-780dc0243865'],
  methods: {
    importMenu: {
      name: 'Import Menu',
      logic: async ({ connectionContainer, config }) => {
        const {
          rdic,
          user,
          createEvent
        } = connectionContainer
        const [url] = config

        assert(isUrl(url), "Please provide your Just Eat menu URL.")

        const badConnection = (e) => {
          createEvent({
            type: 'CONNECTION_BAD',
            userId: user.id,
            customData: { id: 'CONNECTION_JUSTEAT', message: e.message }
          })
        }

        importMenu(url)
          .then((res) => {
            (async () => {
              global.rdic.logger.log({}, '[CONNECTION_JUSTEAT] [importMenu] scraped menu', res)

              try {
                for (let i = 0; i < res.length; i++) {
                  const productsToWrite = res[i].products.map(product => new Product(
                    {
                      name: product.item,
                      description: product.description,
                      currency: user.currency || 'GBP',
                      price: product.price,
                      userId: user.id,
                    }
                  ))

                  const promises = productsToWrite.map(productToWrite => {
                    return rdic.get('datalayerRelational').create('products', productToWrite.toDatalayerRelational())
                  })
                  await Promise.all(promises)

                  global.rdic.logger.log({}, '[CONNECTION_JUSTEAT] [importMenu] productsToWrite written', productsToWrite)

                  const entity = new ProductCategory(
                    {
                      name: res[i].category,
                      products: productsToWrite.map(product => product.id),
                      userId: user.id,
                      view: 'list'
                    },
                    user
                  )

                  await rdic.get('datalayerRelational').create('product_categories', entity.toDatalayerRelational())
                  global.rdic.logger.log({}, '[CONNECTION_JUSTEAT] [importMenu] products written to category', entity)
                }

                global.rdic.logger.log({}, '[CONNECTION_JUSTEAT] [importMenu] success')
                createEvent({
                  type: 'CONNECTION_GOOD',
                  userId: user.id,
                  customData: { id: 'CONNECTION_JUSTEAT', message: 'MENU IMPORTED' }
                })
              } catch (err) {
                global.rdic.logger.log({}, '[CONNECTION_JUSTEAT] [importMenu] product creation err', err)
                badConnection(err)
              }
            })()
          })
          .catch((err) => {
            global.rdic.logger.log({}, '[CONNECTION_JUSTEAT] [importMenu] err', err)
            badConnection(err)
          })

        return {
          url
        }
      }
    }
  }
})

