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
        console.log('Danesh connectionContainer: ', connectionContainer)
        const {
          rdic,
          user,
          createEvent
        } = connectionContainer
        const [url] = config
        console.log('danesh config: ', config)

        assert(isUrl(url), "Please provide your Just Eat menu URL.")

        const badConnection = (e) => {
          createEvent({
            type: 'CONNECTION_BAD',
            userId: user.id,
            customData: { id: 'CONNECTION_JUSTEAT', message: e.message }
          })
        }

        // const menu = await importMenu(url)
        importMenu(url)
          .then((res) => {
            (async () => {
              try {
                for (let i = 0; i < res.length; i++) {
                  console.log('danesh res[i].products: ', res[i].products)
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

                  console.log('Danesh toWrite: ', productsToWrite)
                  const entity = new ProductCategory(
                    {
                      name: res[i].category,
                      products: productsToWrite.map(product => product.id),
                      userId: user.id
                    },
                    user
                  )
                  await rdic.get('datalayerRelational').create('product_categories', entity.toDatalayerRelational())

                  createEvent({
                    type: 'CONNECTION_GOOD',
                    userId: user.id,
                    customData: { id: 'CONNECTION_JUSTEAT', message: 'MENU IMPORTED' }
                  })
                }
              } catch (err) {
                console.log('justeat importmenu product write err: ', err)
                badConnection(err)
              }
            })()
          })
          .catch((err) => {
            console.log('justeat importmenu err: ', err)
            badConnection(err)
          })

        return {
          url
        }
      }
    }
  }
})

