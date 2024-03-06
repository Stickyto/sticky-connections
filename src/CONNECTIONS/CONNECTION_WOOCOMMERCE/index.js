const { sum, assert } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')
const makeRequest = require('./makeRequest')

async function eventHookLogic (wasSuccessful, config, connectionContainer, ) {
  const { user, application, thing, payment, createEvent } = connectionContainer
  const [configDomain, configOrderSuccess, configOrderFail] = config
  const userPaymentId = payment.userPaymentId

  if (config.some(_ => _.length === 0) || !userPaymentId) {
    return
  }

  const eventPayload = {
    userId: user.id,
    applicationId: application ? application.id : undefined,
    thingId: thing ? thing.id : undefined,
    paymentId: payment.id,
  }

  try {
    const reqUrl = `https://${configDomain}/wp-json/sticky-payment/v1/payment-notification`
    const reqBody = {
      private_key: user.privateKey,
      order_number: userPaymentId,
      order_status: wasSuccessful ? configOrderSuccess : configOrderFail
    }
    global.rdic.logger.log({}, '[CONNECTION_WOOCOMMERCE]', { wasSuccessful, userPaymentId, configDomain, configOrderSuccess, configOrderFail, reqUrl, reqBody })

    const response = await makeRequest(
      'post',
      reqUrl,
      reqBody
    )
    createEvent({
      ...eventPayload,
      type: 'CONNECTION_GOOD',
      customData: { id: 'CONNECTION_WOOCOMMERCE', theirId: `Payment ID ${payment.id} / ${userPaymentId} status set to "${response.order_status}".` }
    })
  } catch (e) {
    createEvent({
      ...eventPayload,
      type: 'CONNECTION_BAD',
      customData: { id: 'CONNECTION_WOOCOMMERCE', theirId: userPaymentId, message: e.message }
    })
  }
}

module.exports = new Connection({
  id: 'CONNECTION_WOOCOMMERCE',
  name: 'WooCommerce',
  color: '#7F54B3',
  logo: cdn => `${cdn}/connections/CONNECTION_WOOCOMMERCE.svg`,
  configNames: ['Domain', 'Successful order status', 'Failed order status'],
  configDefaults: ['example.com', 'processing', 'failed'],
  eventHooks: {
    'SESSION_CART_PAY': (...args) => eventHookLogic(true, ...args),
    'SESSION_CART_PAY_FAIL': (...args) => eventHookLogic(false, ...args),
  }
})
