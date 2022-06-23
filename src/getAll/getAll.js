const CONNECTIONS = require('../CONNECTIONS')

module.exports = () => Array.from(CONNECTIONS.values())
  .map(c => c.toJson())
