const Connection = require('../Connection')
const makeRequest = require('./makeRequest')

module.exports = new Connection({
  id: 'CONNECTION_ZAPIER',
  name: 'Zapier',
  color: '#03363D',
  logo: cdn => `${cdn}/connections/CONNECTION_ZAPIER.svg`,
  configNames: ['Zap URL'],
  configDefaults: ['https://hooks.zapier.com/hooks/catch/...'],
  methods: {
    ticket: {
      name: 'Zap',
      logic: async ({ body, config }) => {
        const [configEndpoint] = config
        await makeRequest(
          'POST',
          configEndpoint,
          body
        )
      }
    }
  }
})
