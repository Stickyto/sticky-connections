const { assert, isUuid } = require('openbox-node-utils')
const { Thing } = require('openbox-entities')
const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_EML',
  name: 'EML',
  color: '#0497cd',
  logo: cdn => `${cdn}/connections/CONNECTION_EML.svg`,
  configNames: ['Username', 'Password', 'Program', 'Merchant group'],
  configDefaults: ['', '', '', ''],
  userIds: ['5583505a-c36f-464f-8822-793974ddaf53'],
  methods: {
    validateCard: {
      name: 'Validate card',
      logic: async ({ connectionContainer, body, config }) => {
        const { user, rdic } = connectionContainer
        const dlr = rdic.get('datalayerRelational')

        const { realm, table, stickyName = '' } = body
        const [configUsername, configPassword, configProgram, configMerchantGroup] = config
        // assert(isUuid(configApplicationId), 'Config "New flow ID" is not valid.')
        // assert(realm === configUrl, `Config 1 does not match (realm ${realm} vs ${configUrl}).`)
        // assert(table === configTableId, `Config 2 does not match (table ${table} vs ${configTableId}).`)

        // const rawThing = await dlr.readOne('things', { user_id: user.id, name: stickyName.trim() })
        // assert(rawThing, `There is no sticky with name "${stickyName}".`)

        // const thing = new Thing({}, user).fromDatalayerRelational(rawThing, user)
        // thing.applicationId = configApplicationId
        // await dlr.updateOne('things', thing.id, thing.toDatalayerRelational(['application_id']))
      }
    }
  }
})
