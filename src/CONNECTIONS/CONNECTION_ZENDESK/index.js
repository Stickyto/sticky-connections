/* eslint-disable max-len */
const Connection = require('../Connection')
const makeRequest = require('./makeRequest')

module.exports = new Connection({
  id: 'CONNECTION_ZENDESK',
  type: 'CONNECTION_TYPE_CRM',
  name: 'Zendesk',
  color: '#03363D',
  logo: cdn => `${cdn}/connections/CONNECTION_ZENDESK.svg`,
  configNames: ['Endpoint', 'Email', 'API key', 'Priority'],
  configDefaults: ['acme.zendesk.com', 'sales@acme.co', 'api_key', 'urgent'],
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
