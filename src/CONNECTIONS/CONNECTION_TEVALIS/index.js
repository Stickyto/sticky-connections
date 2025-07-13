const Connection = require('../Connection')
const methodPayment = require('../../methodPayment')

module.exports = new Connection({
  id: 'CONNECTION_TEVALIS',
  name: 'Tevalis',
  color: '#003C5F',
  logo: cdn => `${cdn}/connections/CONNECTION_TEVALIS.svg`,
  configNames: [],
  configDefaults: [],
  partnerNames: ['Tevalis', 'Elite Dynamics', 'RoyaleResorts'],
  methods: {
    'private--payment': {
      name: 'Private -> Payment',
      logic: async calledWith => methodPayment('CONNECTION_TEVALIS', calledWith)
    }
  }
})
