const { assert, isUuid } = require('openbox-node-utils')
const { Thing } = require('openbox-entities')
const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_QUICKBASE',
  name: 'Quickbase',
  color: '#1b6874',
  logo: cdn => `${cdn}/connections/CONNECTION_QUICKBASE.svg`,
  configNames: ['URL', 'Table ID', 'New flow ID'],
  configDefaults: ['sticky-1077.quickbase.com', 'btcffgi7h', ''],
  userIds: ['e4ed18ba-8074-418b-b295-d699e96abd01'],
  methods: {
    addRecord: {
      name: 'Add record',
      logic: async ({ connectionContainer, body, config }) => {
        const { user, rdic } = connectionContainer
        const dlr = rdic.get('datalayerRelational')

        const { realm, table, stickyName = '' } = body
        const [configUrl, configTableId, configApplicationId] = config
        assert(isUuid(configApplicationId), 'Config "New flow ID" is not valid.')
        assert(realm === configUrl, `Config 1 does not match (realm ${realm} vs ${configUrl}).`)
        assert(table === configTableId, `Config 2 does not match (table ${table} vs ${configTableId}).`)

        const rawThing = await dlr.readOne('things', { user_id: user.id, name: stickyName.trim() })
        assert(rawThing, `There is no sticky with name "${stickyName}".`)

        const thing = new Thing({}, user).fromDatalayerRelational(rawThing, user)
        thing.applicationId = configApplicationId
        await dlr.updateOne('things', thing.id, thing.toDatalayerRelational(['application_id']))
      }
    }
  }
})
