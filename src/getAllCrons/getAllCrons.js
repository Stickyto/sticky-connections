const CONNECTIONS = require('../CONNECTIONS')

module.exports = () => {
  const allConnections = Array.from(CONNECTIONS.values())
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
