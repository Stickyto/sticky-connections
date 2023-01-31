const got = require('got')
const { getNow } = require('openbox-node-utils')
const Connection = require('../Connection')

const headers = {
  'accept-language': 'en-GB,en;q=0.9',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
}

async function makeRequest (method, url, json) {
  const { body: bodyAsString } = await got[method](url, { headers, json })
  return typeof bodyAsString === 'string' && bodyAsString.length > 0 ? JSON.parse(bodyAsString) : undefined
}

module.exports = new Connection({
  id: 'CONNECTION_DOMCENTRAL',
  name: 'Domino\'s Pizza',
  color: '#393336',
  logo: cdn => `${cdn}/connections/CONNECTION_DOMCENTRAL.svg`,
  configNames: ['Store ID'],
  configDefaults: [''],
  partnerNames: ['Domino\'s Pizza'],
  crons: [
    {
      id: 'generic',
      frequency: '*/2 * * * *',
      logic: async function (user, cronContainer) {
        const { rdic } = cronContainer
        global.rdic.logger.log({}, '[job-CONNECTION_DOMCENTRAL] [go]', { userId: user.id })
        try {
          const { config } = user.connections.find(c => c.id === 'CONNECTION_DOMCENTRAL')
          let [configStoreId] = config
          const theirData = await makeRequest('get', `https://www.dominos.co.uk/ProductCatalog/GetStoreCatalog?collectionOnly=false&menuVersion=637913119800000000&storeId=${configStoreId}&v=115.1.0.3`)

          const allPcsToday = await cronContainer.getProductCategories(rdic, user, 'CONNECTION_DOMCENTRAL')
          if (allPcsToday.length > 0) {
            // already configured product categories; exit early
            return
          }
          for (let tdI = 0; tdI < theirData.length; tdI++) {
            const td = theirData[tdI]
            for (let tdI2 = 0; tdI2 < td.subcategories.length; tdI2++) {
              const td2 = td.subcategories[tdI2]
              const createdPis = []
              for (let pI = 0; pI < td2.products.length; pI++) {
                const p = td2.products[pI]
                const { id: createdPId } = await cronContainer.createProduct({
                  userId: user.id,
                  theirId: p.productId,
                  createdAt: getNow() + pI,
                  connection: 'CONNECTION_DOMCENTRAL',
                  currency: user.currency,
                  name: p.name,
                  price: 0,
                  media: [
                    {
                      type: 'image',
                      url: p.imageUrl
                    }
                  ],
                  questions: [
                    {
                      type: 'option',
                      question: 'What size?',
                      answer: p.productSkus[0].name,
                      options: p.productSkus.map(_ => ({
                        type: 'option',
                        name: _.name,
                        theirId: _.productSkuId,
                        delta: Math.ceil(_.price * 100),
                        media: [
                          {
                            type: 'image',
                            url: `https://www.dominos.co.uk${_.iconUrl}`
                          }
                        ]
                      }))
                    }
                  ],
                  description: p.description
                })
                createdPis.push(createdPId)
              }
              await cronContainer.createProductCategory(
                {
                  userId: user.id,
                  name: td2.name,
                  // name: `${td.name} → ${td2.name}`,
                  color: '#1a1a18',
                  theirId: [td.name, td2.name].join('--__--'),
                  createdAt: getNow() + tdI,
                  connection: 'CONNECTION_DOMCENTRAL',
                  view: 'grid-name',
                  products: createdPis
                },
                user
              )
            }
          }
        } catch ({ message }) {
          const payload = {
            type: 'CONNECTION_BAD',
            userId: user.id,
            customData: { id: 'CONNECTION_DOMCENTRAL', message }
          }
          await cronContainer.createEvent(payload)
          global.rdic.logger.error({}, { message })
        }
      }
    }
  ],
  methods: {
    getStore: {
      name: 'Get store',
      logic: async ({ config }) => {
        const [configStoreId] = config
        return (await makeRequest('get', `https://www.dominos.co.uk/api/stores/v1/stores/${configStoreId}/details`)).data
      }
    },
    getMenu: {
      name: 'Get menu',
      logic: async ({ config }) => {
        const [configStoreId] = config
        return await makeRequest('get', `https://www.dominos.co.uk/ProductCatalog/GetStoreCatalog?collectionOnly=false&menuVersion=637913119800000000&storeId=${configStoreId}&v=115.1.0.3`)
      }
    }
  }
})
