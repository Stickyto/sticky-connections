const { assert } = require('@stickyto/openbox-node-utils')
const CONNECTIONS = require('../CONNECTIONS')
const connectionGo = require('../connectionGo')

module.exports = async function go (connection, method, { rdic, user, partner, body }) {
  const foundConnection = CONNECTIONS.get(connection)
  assert(typeof foundConnection === 'object', `There isn't a connection called ${connection}!`)

  const toReturn = await connectionGo(foundConnection, method, { rdic, user, partner, body })
  return toReturn
}
