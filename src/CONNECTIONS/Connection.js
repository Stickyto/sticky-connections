const secrets = require('openbox-secrets')

class Connection {
  constructor(json) {
    this.payGoToKeys = []
    this.crons = []
    this.instructions = []
    this.methods = {}
    this.configPerApplicationBlock = {}
    this.eventHooks = {}
    this.userIds = []
    Object.keys(json).forEach(k => {
      this[k] = json[k]
    })
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

  toJson() {
    return {
      id: this.id,
      name: this.name,
      payGoToKeys: this.payGoToKeys,
      color: this.color,
      logo: this.logo(secrets.cdn),
      logoInverted: this.logoInverted ? this.logoInverted(secrets.cdn) : undefined,
      instructions: this.instructions,
      configNames: this.configNames,
      configDefaults: this.configDefaults,
      configPerApplicationBlock: this.configPerApplicationBlock,
      methods: Object.keys(this.methods).map(x => [x, this.methods[x].name])
    }
  }
}

module.exports = Connection
