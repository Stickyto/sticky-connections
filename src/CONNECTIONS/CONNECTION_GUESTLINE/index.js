const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_GUESTLINE',
  name: 'Guestline',
  color: '#1f1c4d',
  logo: cdn => `${cdn}/connections/CONNECTION_GUESTLINE.svg`,
  configNames: ['One'],
  configDefaults: ['Two'],
  methods: {}
})
