/* eslint-disable quotes */
const { Payment } = require('openbox-entities')
const Connection = require('../Connection')
const makeRequest = require('./makeRequest')
const { assert, services } = require('@stickyto/openbox-node-utils')
const VALID_THING_PASSTHROUGHS = ['None', 'Your ID', 'Name', 'Number', 'Note']

async function getToken (cSubdomain, cUsername, cPassword) {
  const { token } = await makeRequest(
    {},
    'POST',
    'https://api.thegoodtill.com/api/login',
    {
      'subdomain': cSubdomain,
      'username': cUsername,
      'password': cPassword
    }
  )
  return token
}

async function eventHookLogic (config, connectionContainer) {
  const {user, application, thing, payment, event, customData, createEvent} = connectionContainer

  if (!thing) {
    return
  }

  function goFail(e) {
    createEvent({
      type: 'CONNECTION_BAD',
      userId: user.id,
      paymentId: event.paymentId,
      applicationId: application ? application.id : undefined,
      thingId: thing ? thing.id : undefined,
      customData: {id: 'CONNECTION_SUMUP', message: e.message}
    })
      .then(createdEvent => {
        const toEmail = {
          user,
          subject: `SumUp injection failure at "${user.name}"`,
          message: `
<p>Event ID: ${createdEvent.id}</p>
<p>Payment ID: ${event.paymentId}</p>
<p>SumUp said: ${e.message}</p>
          `,
          to: 'dev@sticky.to'
        }
        services.mail.quickSend(rdic, toEmail)
      })
  }

  let [cSubdomain, cUsername, cPassword, cVendorId, cThingPassthrough, cSendOrder] = config
  global.rdic.logger.log({}, '[CONNECTION_SUMUP]', { cSubdomain, cUsername, cPassword, cVendorId, cThingPassthrough, cSendOrder })

  let token
  try {
    assert(customData.cart.length > 0, 'The bag is empty.')
    assert(cSendOrder === 'Yes', 'Send order (Yes/No) is not set to "Yes".')
    assert(VALID_THING_PASSTHROUGHS.includes(cThingPassthrough), `Sticker passthrough is not one of (${VALID_THING_PASSTHROUGHS.join('/')})`)

    token = await getToken(cSubdomain, cUsername, cPassword)
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

  let finalNote = (() => {
    const parts = []
    typeof payment.extra === 'string' && payment.extra.length > 0 && parts.push(payment.extra)
    thing && cThingPassthrough === 'Note' && parts.push(`[${thing.name.toUpperCase()}]`)
    payment.cart.getRaw().forEach(_ => {
      _.questions.length > 0 && parts.push(`${_.productName}: ${_.questions.map(question => {
        const lhs = question.question.trim()
        return `${lhs ? `${lhs}=>` : ''}${question.answer.toString().replaceAll(_.productName, '').trim()}`
      }).join('; ')}`)
    })
    return parts.length > 0 ? parts.join(' -- ').substring(0, 190) : undefined
  })()

  let currentSequenceNumber = 1
  let runningTotal = 0
  const salesItems = []
  payment.cart.getRaw().forEach(_ => {
    if (!_.productTheirId) {
      return
    }
    const questionsWhichAreVariants = _.questions.filter(___ => ___.question === ' ')

    if (questionsWhichAreVariants.length === 0) {
      const toAddToRunningTotal = Math.floor(_.productPrice * _.quantity)
      runningTotal += toAddToRunningTotal
      salesItems.push({
        product_id: _.productTheirId,
        name: _.productName,
        quantity: _.quantity,
        sequence_no: currentSequenceNumber,
        price: (_.productPrice / 100).toFixed(2)
      })
      currentSequenceNumber += 1
    } else {
      questionsWhichAreVariants.forEach(question => {
        const foundOption = question.options.find(o => o.name === question.answer)
        if (!foundOption) {
          return
        }
        if (!foundOption.theirId) {
          return
        }
        const toAddToRunningTotal = Math.floor(_.productPrice * _.quantity)
        runningTotal += toAddToRunningTotal
        salesItems.push({
          product_id: foundOption.theirId,
          name: `${_.productName}: ${foundOption.name}`,
          quantity: _.quantity,
          sequence_no: currentSequenceNumber,
          price: (_.productPrice / 100).toFixed(2)
        })
        currentSequenceNumber += 1
      })
    }
  })

  if (runningTotal !== payment.total) {
    const toEmail = {
      user,
      subject: `SumUp total mis-match at "${user.name}"`,
      message: `
  <p>Payment total: ${payment.total}</p>
  <p>SumUp total: ${runningTotal}</p>
  <p>Payment ID: ${event.paymentId}</p>
      `,
      to: 'dev@sticky.to'
    }
    services.mail.quickSend(rdic, toEmail)
  }

  const theJson = {
    'status': 'ACCEPTED',
    'type': 'DROPOFF',
    'strict_payments': false,
    'dropoff_point': (() => {
      if (!thing) {
        return '???'
      }
      if (cThingPassthrough === 'None') {
        return '???'
      }
      if (cThingPassthrough === 'Your ID') {
        return thing.theirId || '???'
      }
      if (cThingPassthrough === 'Name') {
        return thing.name
      }
      if (cThingPassthrough === 'Number') {
        return thing.name.split('').filter(_ => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].includes(_)).join('')
      }
      return '???'
    })(),
    'order_ref': temporaryPayment.consumerIdentifier,
    'vendor_order_ref': event.paymentId,
    'notes': finalNote,
    'user': {
      name: typeof payment.name === 'string' && payment.name.length > 0 ? payment.name : undefined,
      phone: typeof payment.phone === 'string' && payment.phone.length > 0 ? payment.phone : undefined,
    },
    'sales_items': salesItems,
    'payments': [
      {
        'method': 'CARD',
        'amount': (runningTotal / 100).toFixed(2)
      }
    ]
  }

  global.rdic.logger.log({}, '[CONNECTION_SUMUP] customData', JSON.stringify(customData, null, 2))
  global.rdic.logger.log({}, '[CONNECTION_SUMUP] theJson', JSON.stringify(theJson, null, 2))

  try {
    global.rdic.logger.log({}, '[CONNECTION_SUMUP]', { token, cVendorId })
    const r = await makeRequest(
      {
        'Authorization': `Bearer ${token}`,
        'Vendor-Id': cVendorId,
        'Outlet-Id': ({
          'Waterfront Street Kitchen and Bar': '1a6ea3e2-d368-4912-bed4-c828c31eecb0',
          'The Bridge Restaurant': 'fe6a4504-1b14-4664-abd5-aed5dcf5bcf8',
          'Aston Villa': 'e78a6a3f-3429-45ca-bb5d-a396464aa82c'
        })[user.name]
      },
      'POST',
      'https://api.thegoodtill.com/api/external_sale/sale',
      theJson
    )
    global.rdic.logger.log({}, '[CONNECTION_SUMUP] r', { r })
    assert(r.status, r.message || '(No message key)')

    payment.userPaymentId = r.data.sale_id
    await rdic.get('datalayerRelational').updateOne('payments', payment.id, payment.toDatalayerRelational(['user_payment_id']))

  } catch (e) {
    goFail(e)
  }
}

function getFinalName (_) {
  return _.display_name || _.product_name
}

module.exports = new Connection({
  id: 'CONNECTION_SUMUP',
  type: 'CONNECTION_TYPE_POINT_OF_SALE',
  name: 'SumUp POS',
  color: '#000000',
  logo: cdn => `${cdn}/connections/CONNECTION_SUMUP.svg`,
  logoInverted: cdn => `${cdn}/connections/CONNECTION_SUMUP_WHITE.svg`,
  configNames: ['Subdomain', 'Username', 'Password', 'Vendor ID', `Sticker passthrough (${VALID_THING_PASSTHROUGHS.join('/')})`, 'Send order (Yes/No)', 'Outlet', 'Pull external orders (Yes/No)'],
  configDefaults: ['', '', '', '', 'Name', 'No', '', 'No'],
  eventHooks: {
    'SESSION_CART_PAY': eventHookLogic
  },
  methods: {
    getLocations: {
      name: 'Pull',
      uiPlaces: ['products'],
      logic: async ({ config }) => {
        const [cSubdomain, cUsername, cPassword, _1, _2, _3, cOutletName] = config

        const token = await getToken(cSubdomain, cUsername, cPassword)
        const outletsData = await makeRequest(
          {
            'Authorization': `Bearer ${token}`
          },
          'GET',
          'https://api.thegoodtill.com/api/outlets'
        )
        assert(outletsData.status)
        const { data: outlets } = outletsData

        const foundOutlet = outlets.find(o => o.outlet_name === cOutletName)
        assert(foundOutlet, `There is no outlet with name "${cOutletName}". The outlet names are:\n\n${outlets.map(o => o.outlet_name).join('\n\n')}`)

        const suProductsData = await makeRequest(
          {
            'Authorization': `Bearer ${token}`,
            'Outlet-Id': foundOutlet.id
          },
          'GET',
          'https://api.thegoodtill.com/api/products'
        )
        assert(suProductsData.status)
        return suProductsData.data
          .filter(product => product.outlet_id === foundOutlet.id)
          .map(product => ({ id: product.id, name: getFinalName(product) }))
      }
    }
  }
})
