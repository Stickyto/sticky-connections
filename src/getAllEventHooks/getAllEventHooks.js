const CONNECTIONS = require('../CONNECTIONS')

module.exports = (userId, partnerName) => {
  const allConnections = Array.from(CONNECTIONS.values())
    .filter(c => c.isAMatch(userId, partnerName))
  const toReturn = []
  allConnections.forEach(_ => {
    Object.keys(_.eventHooks).forEach(ek => {
      toReturn.push({
        connectionId: _.id,
        type: ek,
        logic: _.eventHooks[ek]
      })
    })
  })
  return toReturn
}
