/* eslint-disable max-len */
const Connection = require('../Connection')
const { assert, isUuid, getSessionUrl } = require('openbox-node-utils')
const makeRequest = require('./makeRequest')

module.exports = new Connection({
  id: 'CONNECTION_PASSKIT',
  name: 'PassKit',
  color: '#303030',
  logo: cdn => `${cdn}/connections/CONNECTION_PASSKIT.svg`,
  configNames: ['API key', 'Tier ID', 'Program ID'],
  configDefaults: ['', '', ''],
  userIds: ['d7e01f55-a9a0-4b86-8a36-dd13131ee697'],
  methods: {
    go: {
      name: 'Go',
      logic: async ({ config, connectionContainer, body }) => {
        const { user } = connectionContainer
        const [configApiKey, configTierId, configProgramId] = config
        assert(configApiKey, 'You have not set a valid API key.')
        assert(configTierId, 'You have not set a valid tier ID.')
        assert(configProgramId, 'You have not set a valid program ID.')

        const { toThingId, toApplicationId, sessionId, sessionName } = body
        assert(isUuid(sessionId), 'sessionId is not a UUID.')

        const { id: memberId } = await makeRequest(
          configApiKey,
          'post',
          'https://api.pub1.passkit.io/members/member',
          {
            'tierId': configTierId,
            'programId': configProgramId,
            'externalId': [sessionId, user.id].join('.').substring(0, 100),
            'metaData': {
              'url': getSessionUrl(global.rdic, { sessionId, toThingId, toApplicationId })
            },
            'person': {
              'forename': sessionName || 'Member'
            }
          }
        )

        return memberId
      }
    }
  }
})
