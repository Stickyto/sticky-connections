const CONNECTIONS = require('../CONNECTIONS')

module.exports = (userId, partnerId) => Array.from(CONNECTIONS.values())
  .filter(c => c.isAMatch(userId, partnerId))
  .map(c => c.toJson())
