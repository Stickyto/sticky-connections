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

  logo (cdn) {
    return `${cdn}/connections/CONNECTION_UNKNOWN.svg`
  }

  isAMatch (userId, partnerName) {
    if (Array.isArray(this.partnerNames)) {
      return this.partnerNames.includes(partnerName)
    }
    if (this.userIds.length > 0) {
      return this.userIds.includes(userId)
    }
    return true
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
