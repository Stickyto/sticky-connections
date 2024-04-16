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
  instructions: ({ rdic, user, applications }) => {
    const { apiUrl } = rdic.get('environment')
    const foundApplication = applications.find(_ => _.baseSettingsRender === 'stickypay') || { id: 'You need a flow with this template: "Take a payment".' }
    return [
      {
        "id": "a21eddf2-aa86-4b6a-a2af-8ac279b246f7",
        "config": {
          "action": "url~~||~~https://github.com/Stickyto/sticky-woocommerce-plugin/archive/refs/heads/master.zip",
          "label": "Download plug in",
          "colour": "#7f54b3",
          "foregroundColour": "#ffffff",
          "icon": "arrowDown",
          "fullWidth": false
        }
      },
      {"id":"6121bb17-a3b4-4df4-b64e-1149ce4d7140","config":{}},
      {
        "id": "71d05208-3781-4c24-996e-c4c0d1c6b228",
        "config": {
          "what": `Flow URL:\n\n<strong>${apiUrl}/go/flow/${foundApplication.id}</strong>\n\nPrivate key:\n\n<strong>${user.privateKey}</strong>`,
          "font": "#1A1F35--center--100%--false",
          "backgroundColour": "#ffffff",
          "icon": ""
        }
      }
    ]
  },
  eventHooks: {
    'SESSION_CART_PAY': (...args) => eventHookLogic(true, ...args),
    'SESSION_CART_PAY_FAIL': (...args) => eventHookLogic(false, ...args),
  }
})
