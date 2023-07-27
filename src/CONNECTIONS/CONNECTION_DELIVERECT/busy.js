const { assert } = require('@stickyto/openbox-node-utils')

module.exports = {
  name: 'Busy',
  logic: async ({ connectionContainer, config, body }) => {
    const {
      rdic,
      user,
      createEvent
    } = connectionContainer

    const { channelLinkId, status } = body
    let [, configuredChannelLinkIds] = config
    configuredChannelLinkIds = configuredChannelLinkIds.split(',').map(_ => _.trim())

    const statusMap = new Map([
      ['PAUSED', false],
      ['ONLINE', true]
    ])

    try {
      const foundChannelLinkId = configuredChannelLinkIds.find(_ => _ === channelLinkId)
      assert(foundChannelLinkId, `[CONNECTION_DELIVERECT] [busy] [1] Channel link IDs do not match (foundChannelLinkId is falsy; ${channelLinkId} provided vs one of configured ${configuredChannelLinkIds.join(' / ')})`)

      const theStatus = statusMap.get(status)
      assert(typeof theStatus === 'boolean', '[busy] "status" is not valid; are you really Deliverect?')

      await rdic.get('datalayerRelational').updateMany('product_categories', { user_id: user.id, their_id: `startsWith:${foundChannelLinkId}---`, connection: 'CONNECTION_DELIVERECT' }, `is_enabled = ${theStatus}`)
    } catch (e) {
      createEvent({
        type: 'CONNECTION_BAD',
        userId: user.id,
        customData: { id: 'CONNECTION_DELIVERECT', message: e.message }
      })
      throw e
    }
    return {
      status,
      originalBody: body
    }
  }
}
