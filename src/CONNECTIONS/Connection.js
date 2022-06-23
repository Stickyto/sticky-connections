const secrets = require('openbox-secrets')

class Connection {
  constructor (json) {
    this.payGoToKeys = []
    this.crons = []
    this.instructions = []
    this.methods = {}
    Object.keys(json).forEach(k => {
      this[k] = json[k]
    })
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
      configDefaults: this.configDefaults
    }
  }
}

module.exports = Connection