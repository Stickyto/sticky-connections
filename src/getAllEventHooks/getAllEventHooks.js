const CONNECTIONS = require('../CONNECTIONS')

module.exports = () => {
  const allConnections = Array.from(CONNECTIONS.values())
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
