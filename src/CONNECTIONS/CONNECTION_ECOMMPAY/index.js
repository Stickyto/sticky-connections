const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_ECOMMPAY',
  type: 'CONNECTION_TYPE_OCT',
  name: 'Ecommpay',
  color: '#000000',
  logo: cdn => `${cdn}/connections/CONNECTION_ECOMMPAY.svg`,
  configNames: [],
  configDefaults: [],
  methods: {
    'oct': {
      name: 'OCT',
      logic: async calledWith => {
        return {}
      }
    }
  }
})
