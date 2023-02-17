/* eslint-disable max-len */
const got = require('got')
const Connection = require('../Connection')

async function makeRequest (method, url, json) {
  global.rdic.logger.log({}, '[CONNECTION_RINGCENTRAL] [makeRequest]', { method, url, json })
  const { body: bodyAsString } = await got[method](
    url,
    {
      json
    }
  )
  global.rdic.logger.log({}, '[CONNECTION_RINGCENTRAL] [makeRequest] bodyAsString', bodyAsString)
  return typeof bodyAsString === 'string' && bodyAsString.length > 0 ? JSON.parse(bodyAsString) : undefined
}

module.exports = new Connection({
  id: 'CONNECTION_RINGCENTRAL',
  name: 'RingCentral',
  color: '#ff7b00',
  logo: cdn => `${cdn}/connections/CONNECTION_RINGCENTRAL.png`,
  configNames: ['Webhook URL'],
  configDefaults: ['https://hooks.ringcentral.com/webhook/v2/...'],
  userIds: ['32027163-655c-4881-9bba-780dc0243865'],
  methods: {
    test: {
      name: 'Test',
      logic: async ({ body, config }) => {
        const [webhookUrl] = config
        await makeRequest(
          'post',
          webhookUrl,
          {
            'attachments': [
              {
                'type': 'Card',
                'color': '#ff7b00',
                'title': body.Notifications[0].Action,
                'text': `${body.Notifications[0].Type}`,
                'fields': []
              }
            ]
          }
        )
      }
    }
  }
})
