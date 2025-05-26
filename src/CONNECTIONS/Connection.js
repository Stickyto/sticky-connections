const { env } = require('@stickyto/openbox-node-utils')

class Connection {
  constructor(json) {
    this.crons = []
    this.instructions = ({ rdic, user, applications }) => []
    this.methods = {}
    this.configPerApplicationBlock = {}
    this.eventHooks = {}
    this.userIds = []
    Object.keys(json).forEach(k => {
      this[k] = json[k]
    })
    this.type = this.type || 'CONNECTION_TYPE_GENERIC'
  }

  isAMatch(userId, partnerName) {
    if (!partnerName && Array.isArray(this.partnerNames)) {
      return false
    }
    if (!userId && this.userIds.length > 0) {
      return false
    }
    let doesUserMatch = true, doesPartnerMatch = true
    if (userId && this.userIds.length > 0) {
      doesUserMatch = this.userIds.includes(userId)
    }
    if (partnerName && Array.isArray(this.partnerNames)) {
      doesPartnerMatch = this.partnerNames.includes(partnerName)
    }
    return (doesUserMatch && doesPartnerMatch)
  }

  toJson({ rdic, user, applications }) {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      color: this.color,
      logo: this.logo( env.get('CDN') ),
      logoInverted: this.logoInverted ? this.logoInverted( env.get('CDN') ) : undefined,
      instructions: this.instructions({ rdic, user, applications }),
      configNames: this.configNames,
      configDefaults: this.configDefaults,
      configPerApplicationBlock: this.configPerApplicationBlock,
      methods: Object.keys(this.methods).map(_ => [_, this.methods[_].name, this.methods[_].uiPlaces || []])
    }
  }
}

module.exports = Connection
