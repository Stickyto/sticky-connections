const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_CALENDLY',
  name: 'Calendly',
  color: '#006BFF',
  logo: cdn => `${cdn}/connections/CONNECTION_CALENDLY.svg`,
  configNames: ['Default URL for flow steps'],
  configDefaults: ['https://calendly.com/sticky/lets-talk-am']
})
