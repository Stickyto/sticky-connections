const Connection = require('../Connection')
const methodPayment = require('../../methodPayment')

module.exports = new Connection({
  id: 'CONNECTION_EXTERNAL_PAYMENT',
  type: 'CONNECTION_TYPE_POINT_OF_SALE',
  name: 'External payment',
  color: '#3742FA',
  logo: cdn => `${cdn}/connections/CONNECTION_EXTERNAL_PAYMENT.svg`,
  configNames: [],
  configDefaults: [],
  methods: {
    'private--payment': {
      name: 'Payment',
      logic: async calledWith => methodPayment('CONNECTION_EXTERNAL_PAYMENT', calledWith)
    }
  }
})
