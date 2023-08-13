const Connection = require('../Connection')
const logIn = require('./logIn/logIn')
const getBooking = require('./methods/getBooking/getBooking')
const makePayment = require('./methods/makePayment/makePayment')

async function eventHookLogic (config, connectionContainer) {
  const { user, application, thing, payment, customData, createEvent } = connectionContainer

  customData.cart
    .filter(cartItem => {
      return (typeof cartItem.productTheirId === 'string' && cartItem.productTheirId.length > 0)
    })
    .forEach(cartItem => {
      try {
        global.rdic.logger.log({ user }, '[CONNECTION_GUESTLINE]', { cartItem })
        createEvent({
          type: 'CONNECTION_GOOD',
          userId: user.id,
          applicationId: application ? application.id : undefined,
          thingId: thing ? thing.id : undefined,
          customData: { id: 'CONNECTION_GUESTLINE', theirId: 'Sold something' }
        })
      } catch (e) {
        createEvent({
          type: 'CONNECTION_BAD',
          userId: user.id,
          applicationId: application ? application.id : undefined,
          customData: { id: 'CONNECTION_GUESTLINE', message: e.message }
        })
      }
    })
}

module.exports = new Connection({
  id: 'CONNECTION_GUESTLINE',
  name: 'Guestline',
  color: '#1f1c4d',
  logo: cdn => `${cdn}/connections/CONNECTION_GUESTLINE.svg`,
  configNames: ['Site ID', 'Interface ID', 'Operator code', 'Password'],
  configDefaults: ['', '808', 'STICKY', ''],
  methods: {
    getBooking: {
      name: 'Get a booking',
      logic: async ({ config, body }) => {
        const sessionId = await logIn(config)
        return getBooking(sessionId, body)
      }
    },
    makePayment: {
      name: 'Make a payment',
      logic: async ({ config, body }) => {
        const sessionId = await logIn(config)
        return makePayment(sessionId, body)
      }
    }
  },
  eventHooks: {
    'SESSION_CART_PAY': eventHookLogic
  }
})
