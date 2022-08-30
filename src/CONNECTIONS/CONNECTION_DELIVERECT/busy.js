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
    let [, configuredChannelLinkId, notBusyFlowId, busyFlowId] = config

    const statusMap = new Map([
      ['PAUSED', busyFlowId],
      ['ONLINE', notBusyFlowId]
    ])

    try {
      assert(channelLinkId === configuredChannelLinkId, `[busy] Channel link IDs do not match (${channelLinkId} vs configured ${configuredChannelLinkId})`)
      assert([notBusyFlowId, busyFlowId].every(isUuid), '[busy] One of notBusyFlowId/busyFlowId is not a uuid; please check your configuration!')
      assert(statusMap.has(status), '[busy] "status" body key is not valid; are you really Deliverect?')

      const query = { user_id: user.id, application_id: [notBusyFlowId, busyFlowId] }
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
