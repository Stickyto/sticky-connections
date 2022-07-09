const CONNECTIONS = require('../CONNECTIONS')

module.exports = (userId, partnerId) => {
  const allConnections = Array.from(CONNECTIONS.values())
    .filter(c => c.isAMatch(userId, partnerId))
  const toReturn = []
  allConnections.forEach(connection => {
    connection.crons.forEach(cron => {
      toReturn.push({
        connectionId: connection.id,
        ...cron
      })
    })
  })
  return toReturn
}
