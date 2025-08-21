const { assert, getNow } = require('@stickyto/openbox-node-utils')
const { Event, Product, ProductCategory } = require('openbox-entities')

module.exports = async function connectionGo (foundConnection, method, { rdic, user, partner, body }) {
  assert(foundConnection.isAMatch(user && user.id, partner && partner.name), `Connection ${foundConnection.id} didn't pass isAMatch()`)

  const foundMethod = await foundConnection.methods[method]
  assert(typeof foundMethod === 'object', `${foundConnection.name} doesn't have a method called ${method}!`)

  let config = {}

  user && (() => {
    const foundConfigWrapper = user.connections.find(c => c.id === foundConnection.id)
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
      return event
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
      await rdic.get('datalayerRelational').updateOne('products', entity.id, entity.toDatalayerRelational(['name', 'description', 'categories', 'price', 'is_enabled', 'questions', 'media']))
    },

    getProductCategories: async (rdic, user, query = {}) => {
      const rawEntities = await rdic.get('datalayerRelational').read('product_categories', { user_id: user.id, ...query }, 'created_at ASC')
      return rawEntities.map(re => new ProductCategory(undefined, user).fromDatalayerRelational(re))
    },
    createProductCategory: async (...args) => {
      const toWrite = new ProductCategory(...args)
      await rdic.get('datalayerRelational').create('product_categories', toWrite.toDatalayerRelational())
      return toWrite
    },
    updateProductCategory: async (
      entity,
      keys = [
      'name',
      'description',
      'view',
      'is_enabled',
      'products',
      'color',
      'days',
      'start_at',
      'end_at'
    ]) => {
      entity.updatedAt = getNow()
      await rdic.get('datalayerRelational').updateOne('product_categories', entity.id, entity.toDatalayerRelational(keys))
    }
  }

  const toReturn = await foundMethod.logic({ connectionContainer, config, body })
  return toReturn
}
