const { sum, assert } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')
const makeRequest = require('./makeRequest')

async function eventHookLogic (config, connectionContainer) {
  const { user, application, thing, payment, createEvent } = connectionContainer
  const [configDomain, configConsumerKey, configConsumerSecret, configNewOrderStatus] = config
  const userPaymentId = payment.userPaymentId

  if (config.some(_ => _.length === 0) || !userPaymentId) {
    return
  }

  assert(configDomain.match(/^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/), `${configDomain} isn't a valid domain.`)

  global.rdic.logger.log({}, '[CONNECTION_WOOCOMMERCE]', { userPaymentId, configDomain, configConsumerKey, configConsumerSecret, configNewOrderStatus })

  const eventPayload = {
    userId: user.id,
    applicationId: application ? application.id : undefined,
    thingId: thing ? thing.id : undefined,
    paymentId: payment.id,
  }
  try {
    await makeRequest(
      'put',
      `https://${configDomain}/wp-json/wc/v3/orders/${userPaymentId}`,
      [configConsumerKey, configConsumerSecret],
      {
        status: configNewOrderStatus
      }
    )
    createEvent({
      ...eventPayload,
      type: 'CONNECTION_GOOD',
      customData: { id: 'CONNECTION_WOOCOMMERCE', theirId: userPaymentId }
    })
  } catch (e) {
    createEvent({
      ...eventPayload,
      type: 'CONNECTION_BAD',
      customData: { id: 'CONNECTION_WOOCOMMERCE', message: e.message }
    })
  }
}

module.exports = new Connection({
  id: 'CONNECTION_WOOCOMMERCE',
  name: 'WooCommerce',
  color: '#7F54B3',
  logo: cdn => `${cdn}/connections/CONNECTION_WOOCOMMERCE.svg`,
  configNames: ['Domain', 'Consumer key', 'Consumer secret', 'New order status'],
  configDefaults: ['example.com', '', '', 'processing'],
  eventHooks: {
    'SESSION_CART_PAY': eventHookLogic
  },
  instructions: [
    {
      "id": "9545852c-d64a-457a-8ca0-2b2d1173de9b",
      "config": {
        "url": `https://cdn.sticky.to/connections/CONNECTION_WOOCOMMERCE.svg`,
        "dropShadow": false,
        "corners": "Square",
        "specialEffect": "None",
        "goToUrl": ""
      }
    },
    {
      "id": "a21eddf2-aa86-4b6a-a2af-8ac279b246f7",
      "config": {
        "label": "Get keys",
        "action": "url~~||~~https://woocommerce.github.io/woocommerce-rest-api-docs/#rest-api-keys~~||~~false",
        "colour": "#7F54B3",
        "foregroundColour": "#FFFFFF",
        "icon": "arrowRight",
        "fullWidth": false,
        "dropShadowAndRoundedCorners": true,
        "letterSpacing": 1,
        "backgroundImage": ""
      }
    }
  ]
})
