const { Payment } = require('openbox-entities')
const Connection = require('../Connection')
const getToken = require('./lib/getToken')
const getEnvironment = require('./lib/getEnvironment')
const makeRequest = require('./lib/makeRequest')

const CHANNEL_NAME = 'stickyconnections'

async function eventHookLogic (config, connectionContainer) {
  const { user, application, thing, payment, event, customData, createEvent } = connectionContainer

  function goFail (e) {
    createEvent({
      type: 'CONNECTION_BAD',
      userId: user.id,
      applicationId: application.id,
      customData: { id: 'CONNECTION_DELIVERECT', message: e.message }
    })
  }

  const [environment, channelLinkId] = config
  let foundEnvironment
  try {
    foundEnvironment = getEnvironment(environment)
  } catch (e) {
    goFail(e)
  }

  const temporaryPayment = new Payment({
    id: event.paymentId
  })
  const body = {
    'channelOrderId': event.paymentId,
    'channelOrderDisplayId': temporaryPayment.consumerIdentifier,
    'items': customData.cart.map(_ => ({
      plu: _.productTheirId,
      name: _.productName,
      price: _.productPrice,
      quantity: _.quantity,
      subItems: _.questions
        .map(__ => {
          const foundOption = __.options.find(o => o.name === __.answer)
          if (!foundOption) {
            return undefined
          }
          return {
            plu: foundOption.theirId,
            name: foundOption.name,
            price: 0, // foundOption.delta, // deliverect adds these on top of the prev total
            quantity: 1
          }
        })
        .filter(_ => _)
    })),
    'orderType': 3,
    'decimalDigits': 2,
    'orderIsAlreadyPaid': customData.gateway !== 'GATEWAY_NOOP',
    'payment': {
      'amount': customData.total,
      'type': 0
    },
    'customer': {
      name: typeof payment.name === 'string' && payment.name.length > 0 ? payment.name : undefined,
      companyName: typeof payment.companyName === 'string' && payment.companyName.length > 0 ? payment.companyName : undefined,
      phoneNumber: typeof payment.phone === 'string' && payment.phone.length > 0 ? payment.phone : undefined,
      email: typeof payment.email === 'string' && payment.email.length > 0 ? payment.email : undefined,
      note: payment.sessionId
    },
    'note': typeof payment.extra === 'string' && payment.extra.length > 0 ? payment.extra : undefined,
    'table': (thing && typeof thing.theirId === 'string' && thing.theirId.length > 0) ? thing.theirId : undefined
  }

  global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] customData', JSON.stringify(customData, null, 2))
  global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] body', JSON.stringify(body, null, 2))

  try {
    const token = await getToken(config)
    global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] token', token)
    const r = await makeRequest(
      token,
      'post',
      `${foundEnvironment.apiUrl}/${CHANNEL_NAME}/order/${channelLinkId}`,
      body
    )
    global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] r', r)
  } catch (e) {
    goFail(e)
  }
}

module.exports = new Connection({
  id: 'CONNECTION_DELIVERECT',
  name: 'Deliverect',
  color: '#05CC79',
  logo: cdn => `${cdn}/connections/CONNECTION_DELIVERECT.svg`,
  configNames: ['"Sandbox"/"Production"', 'Channel link ID', 'Location ID', '"Not busy" flow ID', '"Busy" flow ID'],
  configDefaults: ['Sandbox', '', '', '', ''],
  methods: {
    inboundMenu: require('./inboundMenu'),
    snooze: require('./snooze'),
    busy: require('./busy'),
    status: require('./status')
  },
  eventHooks: {
    'SESSION_CART_PAY': eventHookLogic
  }
})
