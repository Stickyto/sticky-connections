const { assert, isUuid } = require('@stickyto/openbox-node-utils')
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
    const realReason = reason || 'We\'re sorry but we don\'t know any more.'
    const borkedStatusRs = p => {
      p.paymentGatewayExtra = realReason
      p.onSessionFail(rdic, user, { whichConnection: 'CONNECTION_DELIVERECT' }, { customSubject: '⚠️ Your {name} order was not successful', customMessage: '<p>We are sorry but your {name} order was not successful.</p>' })
      createEvent({
        type: 'TO_DO',
        userId: user.id,
        paymentId: p.id,
        applicationId: p.applicationId,
        thingId: p.thingId,
        customData: {
          what: `Deliverect failed: ${realReason}`,
          colour: '#ff3838',
          foregroundColor: '#ffffff'
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
      assert(_channel === foundChannelLinkId, '[status] _channel does not match foundChannelLinkId; we have really got this wrong.')
      assert(isUuid(coPaymentId), '[status] coPaymentId is not a uuid; we have really got this wrong.')

      const rawPayment = await rdic.get('datalayerRelational').readOne('payments', { user_id: user.id, id: coPaymentId })
      assert(rawPayment, `[status] payment with coPaymentId "${coPaymentId}" not found; we have really got this wrong.`)
      const payment = new Payment(undefined, user).fromDatalayerRelational(rawPayment)
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
