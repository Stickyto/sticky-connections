const { assert, getNow } = require('openbox-node-utils')

module.exports = {
  name: 'Snooze',
  logic: async ({ connectionContainer, config, body }) => {
    const {
      rdic,
      user,
      createEvent,
      getProducts,
      updateProduct
    } = connectionContainer

    const { channelLinkId } = body
    let [configuredChannelLinkId] = config

    try {
      assert(channelLinkId === configuredChannelLinkId, `[snooze] Channel link IDs do not match (${channelLinkId} vs configured ${configuredChannelLinkId})`)
      const plus = body.operations[0].data.items.map(_ => _.plu)

      const allPsToday = await getProducts(rdic, user, 'CONNECTION_DELIVERECT')
      const plusAsPs = plus
        .map(plu => allPsToday.find(_ => _.theirId === plu))
        .filter(_ => _)

      assert(plus.length === plusAsPs.length, `[snooze] plus.length is ${plus.length} but plusAsPs.length is ${plusAsPs.length}; are you trying to snooze a non-product?`)

      // await dlr.updateMany('payments', dlrQuery, `session_paid_at = ${getNow()}, session_failed_at = NULL`)
      await rdic.get('datalayerRelational').updateMany('products', )

    } catch (e) {
      createEvent({
        type: 'CONNECTION_BAD',
        userId: user.id,
        customData: { id: 'CONNECTION_DELIVERECT', message: e.message }
      })
      throw e
    }

    // require('fs').writeFileSync('./webhook--CONNECTION_DELIVERECT.json', JSON.stringify(body))
    return {
      x1: 'x2'
    }
}
