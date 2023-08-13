const Connection = require('../Connection')
const logIn = require('./logIn/logIn')
const getBooking = require('./methods/getBooking/getBooking')
const makePayment = require('./methods/makePayment/makePayment')

async function eventHookLogic (config, connectionContainer) {
  // const { user, application, thing, payment, customData, createEvent } = connectionContainer

  // const howMany = sum(
  //   customData.cart
  //     .filter(_ => {
  //       return (_.productName.indexOf(configMustMatchProductName) !== -1)
  //     })
  //     .map(_ => _.quantity)
  // )
  // global.rdic.logger.log({}, '[CONNECTION_GUESTLINE]', { configForestGardenId, configMustMatchProductName, configApiEndpoint, configApiToken, howMany })

  // if (howMany > 0) {
  //   const body = {
  //     quantity: howMany,
  //     productCode: '---',
  //     referenceNo: payment.id
  //   }
  //   global.rdic.logger.log({}, '[CONNECTION_GUESTLINE] howMany > 0', { body })
  //   try {
  //     global.rdic.logger.log({}, '[CONNECTION_GUESTLINE] exec 1')
  //     const { productInOrderId: theirId1, orderId: theirId2 } = await makeRequest(
  //       configApiToken,
  //       'post',
  //       `${configApiEndpoint}/pig2/api/buy_trees`,
  //       body,
  //       'json'
  //     )
  //     global.rdic.logger.log({}, '[CONNECTION_GUESTLINE] exec 2', { theirId1, theirId2 })
  //     createEvent({
  //       type: 'CONNECTION_GOOD',
  //       userId: user.id,
  //       applicationId: application ? application.id : undefined,
  //       thingId: thing ? thing.id : undefined,
  //       customData: { id: 'CONNECTION_GUESTLINE', theirId: theirId1 }
  //     })
  //   } catch (e) {
  //     createEvent({
  //       type: 'CONNECTION_BAD',
  //       userId: user.id,
  //       applicationId: application ? application.id : undefined,
  //       customData: { id: 'CONNECTION_GUESTLINE', message: e.message }
  //     })
  //   }
  // }
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
