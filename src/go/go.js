const { assert } = require('openbox-node-utils')
const CONNECTIONS = require('../CONNECTIONS')

module.exports = async function go (connection, method, { user, partner, body }) {
  const foundConnection = CONNECTIONS.get(connection)
  assert(typeof foundConnection === 'object', `There isn't a connection called ${connection}!`)

  assert(foundConnection.isAMatch(user && user.id, partner && partner.id), `Connection ${connection} didn't pass isAMatch()`)

  const foundMethod = await foundConnection.methods[method]
  assert(typeof foundMethod === 'object', `${foundConnection.name} doesn't have a method called ${method}!`)

  const foundConfigWrapper = user.connections.find(c => c.id === connection)
  assert(typeof foundConfigWrapper === 'object', `${foundConnection.name} isn't configured!`)

  const { config } = foundConfigWrapper

  const toReturn = await foundMethod.logic({ user, config, body })
  return toReturn
}
