const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_CALENDLY',
  name: 'Calendly',
  color: '#006BFF',
  logo: cdn => `${cdn}/connections/CONNECTION_CALENDLY.svg`,
  configNames: ['URL'],
  configDefaults: ['https://calendly.com/sticky/lets-talk-am'],
  instructionsDone: 'This link will be used as the default.'
})
