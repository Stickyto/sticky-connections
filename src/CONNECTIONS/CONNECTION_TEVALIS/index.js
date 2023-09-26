const { assert, isUuid } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_TEVALIS',
  name: 'Tevalis',
  color: '#003C5F',
  logo: cdn => `${cdn}/connections/CONNECTION_TEVALIS.svg`,
  configNames: [],
  configDefaults: [],
  partnerNames: ['Tevalis', 'Elite Dynamics', 'RoyaleResorts'],
  methods: {
    payment: {
      name: 'Payment',
      logic: async ({ connectionContainer, body, config }) => {
        const {
          sessionId,
          total
        } = body
        assert(isUuid(sessionId), 'sessionId is not a UUID!')
        assert(typeof total === 'number', 'total is not a number!')

        const { user, rdic } = connectionContainer
        const dlr = rdic.get('datalayerRelational')

        return {
          body
        }
      }
    }
  }
})
