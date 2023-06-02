const { assert } = require('openbox-node-utils')

module.exports = {
  name: 'Snooze',
  logic: async ({ connectionContainer, config, body }) => {
    const {
      rdic,
      user,
      createEvent,
      getProducts
    } = connectionContainer

    const { channelLinkId } = body
    let [, configuredChannelLinkIds] = config
    configuredChannelLinkIds = configuredChannelLinkIds.split(',').map(_ => _.trim())

    const actionMap = new Map([
      ['snooze', false],
      ['unsnooze', true]
    ])

    try {
      const foundChannelLinkId = configuredChannelLinkIds.find(_ => _ === channelLinkId)
      assert(foundChannelLinkId, `[CONNECTION_DELIVERECT] [snooze] [1] Channel link IDs do not match (foundChannelLinkId is falsy; ${channelLinkId} provided vs one of configured ${configuredChannelLinkIds.join(' / ')})`)

      const action = body.operations[0].action
      const theAction = actionMap.get(action)
      assert(typeof theAction === 'boolean', '[snooze] "action" body key is not valid; are you really Deliverect?')

      const plus = body.operations[0].data.items.map(_ => `${foundChannelLinkId}---${_.plu}`)

      const allPsToday = await getProducts(rdic, user, { connection: 'CONNECTION_DELIVERECT', their_id: `startsWith:${foundChannelLinkId}---` })
      const plusAsPIds = plus
        .map(plu => allPsToday.find(_ => _.theirId === plu))
        .filter(_ => _)

      assert(plus.length === plusAsPIds.length, `[snooze] plus.length is ${plus.length} but plusAsPIds.length is ${plusAsPIds.length}; are you trying to snooze a non-product?`)

      await rdic.get('datalayerRelational').updateMany('products', { user_id: user.id, their_id: plus, connection: 'CONNECTION_DELIVERECT' }, `is_enabled = ${theAction}`)
    } catch (e) {
      createEvent({
        type: 'CONNECTION_BAD',
        userId: user.id,
        customData: { id: 'CONNECTION_DELIVERECT', message: e.message }
      })
      throw e
    }
    return {}
  }
}
