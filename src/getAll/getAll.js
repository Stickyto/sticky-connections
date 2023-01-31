const CONNECTIONS = require('../CONNECTIONS')

module.exports = (userId, partnerName) => Array.from(CONNECTIONS.values())
  .filter(c => c.isAMatch(userId, partnerName))
  .map(c => c.toJson())
