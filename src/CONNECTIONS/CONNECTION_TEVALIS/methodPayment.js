const { assert, isUuid, getNow } = require('@stickyto/openbox-node-utils')
const { Payment } = require('openbox-entities')

module.exports = async function methodPayment (connection, { connectionContainer, body }) {
  global.rdic.logger.log({}, '[methodPayment]', { connection, body })

  const { createEvent } = connectionContainer
  const {
    sessionId,
    total,
    discount,
    paymentGatewayId
  } = body
  assert(isUuid(sessionId), 'sessionId is not a UUID!')
  assert(typeof total === 'number', 'total is not a number!')
  assert(typeof discount === 'number' || discount === undefined, 'discount is not a number or undefined!')
  assert(typeof paymentGatewayId === 'string' || paymentGatewayId === undefined, 'paymentGatewayId is not a string or undefined!')

  const { user, rdic } = connectionContainer
  const dlr = rdic.get('datalayerRelational')

  const payment = new Payment(
    {
      sessionId,
      type: 'external',
      userId: user.id,
      total,
      discount,
      paymentGatewayId,
      paymentGatewayExtra: connection,
      sessionPaidAt: getNow(),
      gateway: 'GATEWAY_NOOP'
    },
    user
  )
  const asDlr = payment.toDatalayerRelational()
  await dlr.create('payments', asDlr)

  const event = await createEvent({
    type: 'SESSION_CART_PAY',
    userId: user.id,
    paymentId: payment.id,
    sessionId,
    customData: {
      total: payment.total,
      discount: payment.discount,
      currency: payment.currency,
      gateway: payment.gateway,
      cart: []
    }
  })

  return {
    payment: payment.toJsonPrivate(),
    event: event.toJsonPrivate()
  }
}