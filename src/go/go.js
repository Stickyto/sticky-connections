const { assert } = require('@stickyto/openbox-node-utils')
const { Event, Product, ProductCategory } = require('openbox-entities')
const CONNECTIONS = require('../CONNECTIONS')

module.exports = async function go (connection, method, { rdic, user, partner, body }) {
  const foundConnection = CONNECTIONS.get(connection)
  assert(typeof foundConnection === 'object', `There isn't a connection called ${connection}!`)

  assert(foundConnection.isAMatch(user && user.id, partner && partner.name), `Connection ${connection} didn't pass isAMatch()`)

  const foundMethod = await foundConnection.methods[method]
  assert(typeof foundMethod === 'object', `${foundConnection.name} doesn't have a method called ${method}!`)

  let config = {}

  user && (() => {
    const foundConfigWrapper = user.connections.find(c => c.id === connection)
    assert(typeof foundConfigWrapper === 'object', `${foundConnection.name} isn't configured!`)
    config = foundConfigWrapper.config
  })()

  const connectionContainer = {
    rdic,
    user,
    partner,
    createEvent: async function (payload, customCreatedAt) {
      const event = new Event(payload)
      if (typeof customCreatedAt === 'number') {
        event.createdAt = customCreatedAt
      }
      await rdic.get('datalayerRelational').create('events', event.toDatalayerRelational())
    },
    getProducts: async (rdic, user, query = {}) => {
      const rawEntities = await rdic.get('datalayerRelational').read('products', { user_id: user.id, ...query }, 'created_at ASC')
      return rawEntities.map(re => new Product().fromDatalayerRelational(re))
    },
    createProduct: async (...args) => {
      const toWrite = new Product(...args)
      await rdic.get('datalayerRelational').create('products', toWrite.toDatalayerRelational())
      return toWrite
    },
    updateProduct: async entity => {
      await rdic.get('datalayerRelational').updateOne('products', entity.id, entity.toDatalayerRelational(['name', 'description', 'categories', 'price', 'is_enabled', 'questions']))
    },

    getProductCategories: async (rdic, user, query = {}) => {
      const rawEntities = await rdic.get('datalayerRelational').read('product_categories', { user_id: user.id, ...query })
      return rawEntities.map(re => new ProductCategory(undefined, user).fromDatalayerRelational(re))
    },
    createProductCategory: async (...args) => {
      const toWrite = new ProductCategory(...args)
      await rdic.get('datalayerRelational').create('product_categories', toWrite.toDatalayerRelational())
      return toWrite
    },
    updateProductCategory: async entity => {
      await rdic.get('datalayerRelational').updateOne('product_categories', entity.id, entity.toDatalayerRelational([
        'name',
        'description',
        'view',
        'is_enabled',
        'products',
        'color',
        'days',
        'start_at',
        'end_at'
      ]))
    }
  }

  const toReturn = await foundMethod.logic({ connectionContainer, config, body })
  return toReturn
}
