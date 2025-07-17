const { assert, isUuid, getNow } = require('@stickyto/openbox-node-utils')
const { Payment } = require('openbox-entities')
const isCartValid = require('./isCartValid/isCartValid')

module.exports = async function methodPayment (connection, { connectionContainer, body }) {
  global.rdic.logger.log({}, '[methodPayment]', { connection, body })

  const { createEvent } = connectionContainer
  const {
    sessionId,
    applicationId,
    thingId,
    total,
    discount,
    paymentGatewayId,
    cart,
    gateway
  } = body
  assert(isUuid(sessionId) || sessionId === undefined, 'sessionId is not a UUID or undefined!')
  assert(isUuid(applicationId) || applicationId === undefined, 'applicationId is not a UUID or undefined!')
  assert(isUuid(thingId) || thingId === undefined, 'thingId is not a UUID or undefined!')
  assert(typeof total === 'number', 'total is not a number!')
  assert(typeof discount === 'number' || discount === undefined, 'discount is not a number or undefined!')
  assert(typeof paymentGatewayId === 'string' || paymentGatewayId === undefined, 'paymentGatewayId is not a string or undefined!')
  cart !== undefined && isCartValid(cart)

  const { user, rdic } = connectionContainer
  const dlr = rdic.get('datalayerRelational')

  const finalCart = cart ? cart.map(_ => {
    return {
      ..._,
      productCurrency: user.currency,
      questions: []
    }
  }) : undefined
  const finalGateway = gateway || 'GATEWAY_NOOP'
  const payment = new Payment(
    {
      sessionId,
      applicationId,
      thingId,
      type: finalGateway !== 'GATEWAY_NOOP' ? 'sticky' : 'external',
      userId: user.id,
      total,
      discount,
      paymentGatewayId,
      paymentGatewayExtra: connection,
      sessionPaidAt: getNow(),
      gateway: finalGateway,
      cart: finalCart
    },
    user
  )
  const asDlr = payment.toDatalayerRelational()
  await dlr.create('payments', asDlr)

  const event = await createEvent({
    type: 'SESSION_CART_PAY',
    userId: user.id,
    applicationId,
    thingId,
    sessionId,
    paymentId: payment.id,
    customData: {
      total: payment.total,
      discount: payment.discount,
      currency: payment.currency,
      gateway: payment.gateway,
      cart: finalCart,
      tip: 0
    }
  })

  return {
    payment: payment.toJsonPrivate(),
    event: event.toJsonPrivate()
  }
}
