const CONNECTIONS = require('../CONNECTIONS')

module.exports = ({ rdic, user, applications, partnerName }) => Array.from(CONNECTIONS.values())
  .filter(c => c.isAMatch(user.id, partnerName))
  .map(c => c.toJson({ rdic, user, applications }))
