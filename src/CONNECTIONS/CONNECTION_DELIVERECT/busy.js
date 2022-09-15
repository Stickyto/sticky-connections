const { assert, isUuid } = require('openbox-node-utils')

module.exports = {
  name: 'Busy',
  logic: async ({ connectionContainer, config, body }) => {
    const {
      rdic,
      user,
      createEvent
    } = connectionContainer

    const { channelLinkId, status } = body
    let [, configuredChannelLinkId, notBusyApplicationId, busyApplicationId] = config

    const statusMap = new Map([
      ['PAUSED', busyApplicationId],
      ['ONLINE', notBusyApplicationId]
    ])

    try {
      assert(channelLinkId === configuredChannelLinkId, `[busy] Channel link IDs do not match (${channelLinkId} vs configured ${configuredChannelLinkId})`)
      assert([notBusyApplicationId, busyApplicationId].every(isUuid), '[busy] One of notBusyApplicationId/busyApplicationId is not a uuid; please check your configuration!')
      assert(statusMap.has(status), '[busy] "status" body key is not valid; are you really Deliverect?')

      const query = { user_id: user.id, application_id: [notBusyApplicationId, busyApplicationId] }
      const toSet = `application_id = '${statusMap.get(status)}'`

      global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [busy]', { query, toSet })
      await rdic.get('datalayerRelational').updateMany('things', query, toSet)
    } catch (e) {
      createEvent({
        type: 'CONNECTION_BAD',
        userId: user.id,
        customData: { id: 'CONNECTION_DELIVERECT', message: e.message }
      })
      throw e
    }
    return {
      status
    }
  }
}
