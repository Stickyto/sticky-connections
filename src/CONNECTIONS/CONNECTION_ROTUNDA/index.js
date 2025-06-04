const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_ROTUNDA',
  type: 'CONNECTION_TYPE_ERP',
  name: 'Rotunda',
  color: '#EFA71E',
  logo: cdn => `${cdn}/connections/CONNECTION_ROTUNDA.png`,
  configNames: ['URL', 'API key'],
  configDefaults: ['deluxe.rotunda.systems', ''],
  userIds: ['3e43c939-1d76-4238-b51d-a6e27a425677'],
  methods: {
    checkMemberCode: {
      name: 'Check member code',
      logic: async ({ connectionContainer, body, config }) => {
        const { memberCode } = body
        const [configUrl, configApiKey] = config
      }
    }
  }
})
