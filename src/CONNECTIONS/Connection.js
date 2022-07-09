const secrets = require('openbox-secrets')

class Connection {
  constructor (json) {
    this.payGoToKeys = []
    this.crons = []
    this.instructions = []
    this.methods = {}
    this.configPerApplicationBlock = {}
    this.eventHooks = {}
    this.userIds = []
    this.partnerIds = []
    Object.keys(json).forEach(k => {
      this[k] = json[k]
    })
  }

  isAMatch (userId, partnerId) {
    let doesUserMatch = true, doesPartnerMatch = true
    if (userId && this.userIds.length > 0) {
      doesUserMatch = this.userIds.includes(userId)
    }
    if (partnerId && this.partnerIds.length > 0) {
      doesPartnerMatch = this.partnerIds.includes(partnerId)
    }
    return (doesUserMatch && doesPartnerMatch)
  }

  toJson () {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      logo: this.logo(secrets.cdn),
      instructions: this.instructions,
      instructionsDone: this.instructionsDone,
      configNames: this.configNames,
      configDefaults: this.configDefaults,
      configPerApplicationBlock: this.configPerApplicationBlock
    }
  }
}

module.exports = Connection
