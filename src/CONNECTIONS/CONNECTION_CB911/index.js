const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_CB911',
  name: 'Chargebacks911',
  color: '#B90000',
  logo: cdn => `${cdn}/connections/CONNECTION_CB911.svg`,
  configNames: ['API key', 'Post JSON'],
  configDefaults: ['', ''],
  methods: {
    getIframeUrl: {
      name: 'Get iframe URL',
      logic: async ({ connectionContainer, config, body }) => {
        const [apiKey, postJson] = config

        const r1 = await fetch(
          'https://sbx-clients.chargebacks911.com/v1/auth/exchange',
          {
            method: 'POST',
            headers: {
              'Authorization': `ApiKey ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: postJson
          }
        )

        const data1 = await r1.json()
        global.rdic.logger.log({}, '[CONNECTION_CB911]', { body, data1 })
        const { redirect_url: redirectUrl } = data1
        return typeof redirectUrl === 'string' ? redirectUrl : "Sorry, I can't get the redirect URL."
      }
    }
  }
})
