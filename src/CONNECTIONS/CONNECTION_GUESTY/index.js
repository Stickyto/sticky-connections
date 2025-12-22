const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_GUESTY',
  name: 'Guesty',
  type: 'CONNECTION_TYPE_ERP',
  color: '#111111',
  logo: cdn => `${cdn}/connections/CONNECTION_GUESTY.svg`,
  configNames: [],
  configDefaults: [],
  methods: {
    'reservation': {
      name: 'Reservation',
      logic: async ({ connectionContainer, config, body }) => {
        const { user } = connectionContainer
        global.rdic.logger.log({ user }, '[CONNECTION_GUESTY] [methods->reservation]', body)
        return 'methods->reservation is working!'
      }
    }
  }
})
