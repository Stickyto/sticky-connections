/* eslint-disable max-len */
const Connection = require('../Connection')
const makeRequest = require('./makeRequest')

module.exports = new Connection({
  id: 'CONNECTION_ZENDESK',
  name: 'Zendesk',
  color: '#03363D',
  logo: cdn => `${cdn}/connections/CONNECTION_ZENDESK.svg`,
  configNames: ['Endpoint', 'Email', 'API key', 'Priority'],
  configDefaults: ['acme.zendesk.com', 'sales@acme.co', 'api_key', 'urgent'],
  userIds: ['dc6b5519-4e10-44f8-b051-8112e428432d'],
  methods: {
    ticket: {
      name: 'Ticket',
      logic: async ({ body, config }) => {
        const [configEndpoint, configEmail, configApiKey, configPriority] = config
        const { subject: bodySubject, comment: bodyComment } = body
        await makeRequest(
          'POST',
          configEndpoint, configEmail, configApiKey,
          {
            'ticket': {
              'comment': {
                'body': bodyComment
              },
              'priority': configPriority,
              'subject': bodySubject
            }
          }
        )
      }
    }
  }
})
