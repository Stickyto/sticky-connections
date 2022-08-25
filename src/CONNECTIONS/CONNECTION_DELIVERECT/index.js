const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_DELIVERECT',
  name: 'Deliverect',
  color: '05CC79',
  logo: cdn => `${cdn}/connections/CONNECTION_DELIVERECT.svg`,
  configNames: ['Channel link ID'],
  configDefaults: [''],
  methods: {
    inboundMenu: require('./inboundMenu'),
    snooze: require('./snooze')
  }
})
