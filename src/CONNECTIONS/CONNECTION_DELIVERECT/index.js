/* eslint-disable quotes */
const { Payment } = require('openbox-entities')
const Connection = require('../Connection')
const getToken = require('./lib/getToken')
const getEnvironment = require('./lib/getEnvironment')
const makeRequest = require('./lib/makeRequest')
const { assert, getNow } = require('@stickyto/openbox-node-utils')
const { aggregateCartsByProduct } = require('./lib/aggregateCartsByProduct')
const CHANNEL_NAME = 'stickyconnections'
const VALID_THING_PASSTHROUGHS = ['None', 'Your ID', 'Name', 'Number', 'Note']

async function eventHookLogic(config, connectionContainer) {
  const { user, application, thing, payment, event, customData, createEvent } = connectionContainer

  function goFail(e) {
    createEvent({
      type: 'CONNECTION_BAD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      customData: { id: 'CONNECTION_DELIVERECT', message: e.message }
    })
  }

  let [environment, channelLinkId, sendOrder, thingPassthrough = VALID_THING_PASSTHROUGHS[0], groupTime] = config
  groupTime = parseInt(groupTime || '0', 10)
  global.rdic.logger.log({}, '[CONNECTION_DELIVERECT]', { environment, channelLinkId, sendOrder, thingPassthrough, groupTime })

  let foundEnvironment
  try {
    assert(!isNaN(groupTime), 'Group order time (seconds; 0 for no group) is not valid; it must be a number.')
    assert(application, 'There is no flow.')
    assert(customData.cart.length > 0, 'Bag is empty. This is probably fine.')
    assert(sendOrder === 'Yes', 'Send order (Yes/No) is not set to "Yes".')
    assert(VALID_THING_PASSTHROUGHS.includes(thingPassthrough), `Sticker passthrough is not one of (${VALID_THING_PASSTHROUGHS.join('/')})`)
    foundEnvironment = getEnvironment(environment)
  } catch (e) {
    goFail(e)
    return
  }

  const temporaryPayment = new Payment(
    {
      id: event.paymentId
    },
    user
  )

  const channelCarts = aggregateCartsByProduct(customData)

  const howMany = Object.keys(channelCarts).length
  for (const channel in channelCarts) {
    const theDiscount = Math.floor(payment.discount * (1 / howMany))
    channelCarts[channel].body = {
      'channelOrderId': [event.thingId || 'NA', channel, event.paymentId, getNow()].join('---'),
      'channelOrderDisplayId': temporaryPayment.consumerIdentifier,
      'items': channelCarts[channel].cart.map(_ => {
        let subItems = []
        _.questions
          .forEach(__ => {
            const foundOptions = Array.isArray(__.answer) ? __.options.filter(o => __.answer.includes(o.name)) : [__.options.find(o => o.name === __.answer)]
            subItems = [
              ...subItems,
              ...foundOptions.map(foundOption => ({
                plu: foundOption.theirId,
                name: foundOption.name,
                price: 0,
                quantity: 1
              }))
            ]
          })
        return {
          plu: _.productTheirId.split('---')[1],
          name: _.productName,
          price: _.productPrice,
          quantity: _.quantity,
          subItems
        }
      }),
      'orderType': 3,
      'decimalDigits': 2,
      'orderIsAlreadyPaid': true, // customData.gateway !== 'GATEWAY_NOOP'
      'payment': {
        'amount': channelCarts[channel].total - theDiscount,
        'type': 0
      },
      'discountTotal': -theDiscount,
      'customer': {
        name: typeof payment.name === 'string' && payment.name.length > 0 ? payment.name : undefined,
        companyName: typeof payment.companyName === 'string' && payment.companyName.length > 0 ? payment.companyName : undefined,
        phoneNumber: typeof payment.phone === 'string' && payment.phone.length > 0 ? payment.phone : undefined,
        email: typeof payment.email === 'string' && payment.email.length > 0 ? payment.email : undefined,
        note: payment.sessionId
      },
      'note': (() => {
        const parts = []
        thing && thingPassthrough === 'Note' && parts.push(`[${thing.name.toUpperCase()}]`)
        typeof payment.extra === 'string' && payment.extra.length > 0 && parts.push(payment.extra)
        return parts.length > 0 ? parts.join(' ') : undefined
      })(),
      'table': (() => {
        if (!thing) {
          return undefined
        }
        if (thingPassthrough === 'None') {
          return undefined
        }
        if (thingPassthrough === 'Your ID') {
          return thing.theirId || undefined
        }
        if (thingPassthrough === 'Name') {
          return thing.name
        }
        if (thingPassthrough === 'Number') {
          return thing.name.split('').filter(_ => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].includes(_)).join('')
        }
        return undefined
      })()
    }
  }

  global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] customData', JSON.stringify(customData, null, 2))
  global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] body', JSON.stringify(channelCarts, null, 2))

  try {
    const token = await getToken(config)
    global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] token', token)
    for (const channel in channelCarts) {
      const theBody = channelCarts[channel].body
      global.rdic.logger.log({}, '[CONNECTION_DELIVERECT]', { theBody })
      const r = await makeRequest(
        token,
        'post',
        `${foundEnvironment.apiUrl}/${CHANNEL_NAME}/order/${channel}`,
        theBody
      )
      global.rdic.logger.log({}, '[CONNECTION_DELIVERECT]', { r })
    }
  } catch (e) {
    goFail(e)
  }
}

module.exports = new Connection({
  id: 'CONNECTION_DELIVERECT',
  name: 'Deliverect',
  color: '#05CC79',
  logo: cdn => `${cdn}/connections/CONNECTION_DELIVERECT.svg`,
  configNames: ['"Production"/"Sandbox"', 'Channel link IDs (comma separated)', 'Send order (Yes/No)', `Sticker passthrough (${VALID_THING_PASSTHROUGHS.join('/')})`, 'Group order time (seconds; 0 for no group)'],
  configDefaults: ['Production', '', 'No', VALID_THING_PASSTHROUGHS[0], '0'],
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
