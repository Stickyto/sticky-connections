const { assert, formatPrice } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')
const logIn = require('./logIn/logIn')
const getBooking = require('./methods/getBooking/getBooking')
const checkIn = require('./methods/checkIn/checkIn')
const makePayment = require('./methods/makePayment/makePayment')
const somethingSold = require('./methods/somethingSold/somethingSold')

async function eventHookLogic (config, connectionContainer) {
  const { rdic, user, application, thing, payment, customData, createEvent } = connectionContainer
  global.rdic.logger.log({ user }, '[CONNECTION_GUESTLINE] [eventHookLogic]')

  function goSuccess (whatHappened) {
    createEvent({
      type: 'CONNECTION_GOOD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      thingId: thing ? thing.id : undefined,
      customData: { id: 'CONNECTION_GUESTLINE', theirId: whatHappened },
      paymentId: payment.id
    })
  }

  function goFail ({ message }) {
    createEvent({
      type: 'CONNECTION_BAD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      thingId: thing ? thing.id : undefined,
      customData: { id: 'CONNECTION_GUESTLINE', message },
      paymentId: payment.id
    })
  }

  let bookingReference, roomIndex
  try {
    const session = await rdic.dlGetSession(payment.sessionId)
    assert(session, `Payment has session ID ${payment.sessionId} which does not exist; this is very bad.`)
    bookingReference = session.userSectors.readFrom(user.id).readFrom('Guestline booking reference')
    roomIndex = session.userSectors.readFrom(user.id).readFrom('Guestline room index')
    global.rdic.logger.log({ user }, '[CONNECTION_GUESTLINE] [eventHookLogic]', { bookingReference, roomIndex })
    assert(typeof bookingReference === 'string', `"Guestline booking reference" is not set. bookingReference has typeof ${typeof bookingReference} which is wrong; it must be a string.`)
    assert(typeof roomIndex === 'number', `"Guestline room index" is not set. roomIndex has typeof ${typeof roomIndex} which is wrong; it must be a number.`)
  } catch (e) {
    goFail(e)
    return
  }

  const howManyCartItems = customData.cart.length
  const isMakeAPayment = howManyCartItems === 0
  global.rdic.logger.log({ user }, '[CONNECTION_GUESTLINE]'[eventHookLogic] , { howManyCartItems, isMakeAPayment })

  if (isMakeAPayment) {
    const remoteSessionId = await logIn(config)
    global.rdic.logger.log({ user }, '[CONNECTION_GUESTLINE] [eventHookLogic] isMakeAPayment=true', { remoteSessionId })
    const [, , , , paymentCode] = config
    ;(async () => {
      const description = [
        thing && `Sticky: ${thing.name}`,
        `Payment ID: ${payment.id}`,
        `Session ID: ${payment.sessionId}`
      ]
        .filter(_ => _)
        .join(' / ')
      try {
        await makePayment(remoteSessionId, { bookingReference, userIdInThisBooking: undefined, paymentCode, total: payment.total, description, billSplitId: undefined })
        goSuccess(`${bookingReference}: Made a payment (${formatPrice(payment.total, payment.currency)} / payment ID ${payment.id})`)
      } catch (e) {
        goFail(e)
      }
    })()
  } else {
    const finalCartItems = customData.cart
      .filter(cartItem => {
        return (typeof cartItem.productTheirId === 'string' && cartItem.productTheirId.length > 0)
      })
    global.rdic.logger.log({ user }, '[CONNECTION_GUESTLINE] [eventHookLogic] isMakeAPayment=false', { finalCartItemsLength: finalCartItems.length })
    if (finalCartItems.length === 0) {
      return
    }
    const remoteSessionId = await logIn(config)
    global.rdic.logger.log({ user }, '[CONNECTION_GUESTLINE] [eventHookLogic] isMakeAPayment=false', { remoteSessionId })
    finalCartItems
      .forEach((cartItem, ciI) => {
        (async () => {
          try {
            global.rdic.logger.log({ user }, '[CONNECTION_GUESTLINE] [eventHookLogic] isMakeAPayment=false customData->cart->forEach', { cartItem })
            await somethingSold(remoteSessionId, { bookingReference, roomIndex, productCode: cartItem.productTheirId, total: cartItem.productPrice, quantity: cartItem.quantity })
            goSuccess(`${bookingReference}: Upsold ${cartItem.quantity} ${cartItem.productTheirId} as ${ciI + 1} of ${finalCartItems.length} upsells (payment ID ${payment.id})`)
          } catch (e) {
            goFail(e)
          }
        })()
      })
  }
}

module.exports = new Connection({
  id: 'CONNECTION_GUESTLINE',
  name: 'Guestline',
  color: '#1f1c4d',
  userIds: ['cfcffa81-e924-4eac-998d-bac8ec388191'],
  logo: cdn => `${cdn}/connections/CONNECTION_GUESTLINE.svg`,
  configNames: ['Site ID', 'Interface ID', 'Operator code', 'Password', 'Payment code'],
  configDefaults: ['', '808', 'STICKY', '', 'BACS'],
  methods: {
    getBooking: {
      name: 'Get a booking',
      logic: async ({ config, body }) => {
        const remoteSessionId = await logIn(config)
        return getBooking(remoteSessionId, body)
      }
    },
    checkIn: {
      name: 'Check in',
      logic: async ({ config, body }) => {
        const remoteSessionId = await logIn(config)
        return checkIn(remoteSessionId, body)
      }
    }
  },
  eventHooks: {
    'SESSION_CART_PAY': eventHookLogic
  }
})
