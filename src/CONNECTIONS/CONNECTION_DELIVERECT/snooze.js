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
    let [configuredChannelLinkId] = config

    const actionMap = new Map([
      ['snooze', false],
      ['unsnooze', true]
    ])

    try {
      const action = body.operations[0].action
      const plus = body.operations[0].data.items.map(_ => _.plu)

      assert(channelLinkId === configuredChannelLinkId, `[snooze] Channel link IDs do not match (${channelLinkId} vs configured ${configuredChannelLinkId})`)
      assert(actionMap.has(action), '[snooze] "action" body key is not valid; are you really Deliverect?')

      const allPsToday = await getProducts(rdic, user, 'CONNECTION_DELIVERECT')
      const plusAsPIds = plus
        .map(plu => allPsToday.find(_ => _.theirId === plu))
        .filter(_ => _)

      assert(plus.length === plusAsPIds.length, `[snooze] plus.length is ${plus.length} but plusAsPIds.length is ${plusAsPIds.length}; are you trying to snooze a non-product?`)

      await rdic.get('datalayerRelational').updateMany('products', { user_id: user.id, their_id: plus, connection: 'CONNECTION_DELIVERECT' }, `is_enabled = ${actionMap.get(action)}`)
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
