const { assert } = require('openbox-node-utils')
const { Event } = require('openbox-entities')
const CONNECTIONS = require('../CONNECTIONS')

module.exports = async function go (connection, method, { rdic, user, partner, body }) {
  const foundConnection = CONNECTIONS.get(connection)
  assert(typeof foundConnection === 'object', `There isn't a connection called ${connection}!`)

  assert(foundConnection.isAMatch(user && user.id, partner && partner.id), `Connection ${connection} didn't pass isAMatch()`)

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
    createEvent: async function (payload, customCreatedAt) {
      const event = new Event(payload)
      if (typeof customCreatedAt === 'number') {
        event.createdAt = customCreatedAt
      }
      await rdic.get('datalayerRelational').create('events', event.toDatalayerRelational())
    }
  }

  const toReturn = await foundMethod.logic({ connectionContainer, config, body })
  return toReturn
}
