const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_DELIVERECT',
  name: 'Deliverect',
  color: '05CC79',
  logo: cdn => `${cdn}/connections/CONNECTION_DELIVERECT.svg`,
  configNames: ['A name'],
  configDefaults: ['A value'],
  methods: {
    inboundMenu: {
      name: 'Inbound menu',
      logic: async ({ config, body }) => {
        // require('fs').writeFileSync('./webhook--CONNECTION_DELIVERECT.json', JSON.stringify(body))
        // return body
        return {}
      }
    }
  }
})
