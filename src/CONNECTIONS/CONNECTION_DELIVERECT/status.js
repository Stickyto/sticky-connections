const { assert, getNow, isUuid } = require('openbox-node-utils')
const { Payment } = require('openbox-entities')

module.exports = {
  name: 'Status',
  logic: async ({ connectionContainer, config, body }) => {
    const {
      rdic,
      user,
      createEvent
    } = connectionContainer

    const { channelLink, status, reason, channelOrderId } = body
    let [, configuredChannelLinkIds] = config
    configuredChannelLinkIds = configuredChannelLinkIds.split(',').map(_ => _.trim())
    const realReason = reason || 'Deliverect didn\'t provide a reason'
    const borkedStatusRs = p => {
      p.sessionPaidAt = undefined
      p.sessionFailedAt = getNow()
      p.paymentGatewayExtra = realReason
      p.onUpdatedAt()

      createEvent({
        type: 'TO_DO',
        userId: user.id,
        paymentId: p.id,
        applicationId: p.applicationId,
        thingId: p.thingId,
        customData: {
          what: `Deliverect said the order failed (${realReason}).`,
          colour: '#ff3838',
          foregroundColor: '#ffffff',
          specialEffect: 'Bounce'
        }
      })
    }
    const statusMap = new Map([
      [110, borkedStatusRs],
      [120, borkedStatusRs]
    ])

    if (!statusMap.has(status)) {
      return {
        'warning': `I don't recognise status ${status}!`
      }
    }

    try {
      const foundChannelLinkId = configuredChannelLinkIds.find(_ => _ === channelLink)
      assert(foundChannelLinkId, `[CONNECTION_DELIVERECT] [busy] [1] Channel link IDs do not match (foundChannelLinkId is falsy; ${channelLink} provided vs one of configured ${configuredChannelLinkIds.join(' / ')})`)

      const [_thingId, _channel, coPaymentId, _now] = channelOrderId.split('---')
      assert(_channel === foundChannelLinkId, '[status] _channel does not match foundChannelLinkId; we have really screwed up.')
      assert(isUuid(coPaymentId), '[status] coPaymentId is not a uuid; we have really screwed up.')

      const rawPayment = await rdic.get('datalayerRelational').readOne('payments', { user_id: user.id, id: coPaymentId })
      assert(rawPayment, `[status] payment with coPaymentId "${coPaymentId}" not found; we have really screwed up.`)
      const payment = new Payment().fromDatalayerRelational(rawPayment)
      statusMap.get(status)(payment)

      await rdic.get('datalayerRelational').updateOne('payments', payment.id, payment.toDatalayerRelational())
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
