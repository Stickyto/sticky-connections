/* eslint-disable quotes */
const { Payment } = require('openbox-entities')
const Connection = require('../Connection')
const makeRequest = require('./makeRequest')
const { assert, getNow, asyncSeries } = require('@stickyto/openbox-node-utils')
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

async function eventHookLogic(config, connectionContainer) {
  const {user, application, thing, payment, event, customData, createEvent} = connectionContainer

  function goFail(e) {
    createEvent({
      type: 'CONNECTION_BAD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      customData: {id: 'CONNECTION_SUMUP', message: e.message}
    })
  }

  let [cSubdomain, cUsername, cPassword, cVendorId, cThingPassthrough, cSendOrder] = config
  global.rdic.logger.log({}, '[CONNECTION_SUMUP]', { cSubdomain, cUsername, cPassword, cVendorId, cThingPassthrough, cSendOrder })

  let token
  try {
    assert(application, 'There is no flow.')
    assert(customData.cart.length > 0, 'Bag is empty. This is probably fine.')
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

  const theJson = {
    'status': 'ACCEPTED',
    'type': 'DROPOFF',
    'strict_payments': false,
    'dropoff_point': (() => {
      if (!thing) {
        return undefined
      }
      if (cThingPassthrough === 'None') {
        return undefined
      }
      if (cThingPassthrough === 'Your ID') {
        return thing.theirId || undefined
      }
      if (cThingPassthrough === 'Name') {
        return thing.name
      }
      if (cThingPassthrough === 'Number') {
        return thing.name.split('').filter(_ => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].includes(_)).join('')
      }
      return undefined
    })(),
    'order_ref': temporaryPayment.consumerIdentifier,
    'vendor_order_ref': event.paymentId,
    'note': (() => {
      const parts = []
      thing && cThingPassthrough === 'Note' && parts.push(`[${thing.name.toUpperCase()}]`)
      typeof payment.extra === 'string' && payment.extra.length > 0 && parts.push(payment.extra)
      return parts.length > 0 ? parts.join(' ').substring(0, 190) : undefined
    })(),
    'user': {
      name: typeof payment.name === 'string' && payment.name.length > 0 ? payment.name : undefined,
      phone: typeof payment.phone === 'string' && payment.phone.length > 0 ? payment.phone : undefined,
    },
    'sales_items': payment.cart.getRaw().map((_, _i) => {
      return {
        product_id: _.productTheirId,
        name: _.productName,
        quantity: _.quantity,
        sequence_no: _i + 1,
        price: ((_.productPrice * _.quantity) / 100).toFixed(2)
      }
    }),
    'payments': [
      {
        'method': 'CARD',
        'amount': (payment.total / 100).toFixed(2)
      }
    ]
    // 'items': payment.cart.map(_ => {
    //   _.questions
    //     .forEach(__ => {
    //       const foundOptions = Array.isArray(__.answer) ? __.options.filter(o => __.answer.includes(o.name)) : [__.options.find(o => o.name === __.answer)]
    //       subItems = [
    //         ...subItems,
    //         ...foundOptions.map(foundOption => ({
    //           plu: foundOption.theirId,
    //           name: foundOption.name,
    //           price: 0,
    //           quantity: 1
    //         }))
    //       ]
    //     })
    // })
  }

  global.rdic.logger.log({}, '[CONNECTION_SUMUP] customData', JSON.stringify(customData, null, 2))
  global.rdic.logger.log({}, '[CONNECTION_SUMUP] theJson', JSON.stringify(theJson, null, 2))

  try {
    global.rdic.logger.log({}, '[CONNECTION_SUMUP]', { token, cVendorId })
    const r = await makeRequest(
      {
        'Authorization': `Bearer ${token}`,
        'Vendor-Id': cVendorId,
      },
      'POST',
      'https://api.thegoodtill.com/api/external_sale/sale',
      theJson
    )
    global.rdic.logger.log({}, '[CONNECTION_SUMUP]', { r })
  } catch (e) {
    goFail(e)
  }
}

module.exports = new Connection({
  partnerIds: ['5c9e6c25-7b1f-474b-9f04-a8e705654425'],
  id: 'CONNECTION_SUMUP',
  name: 'SumUp POS',
  color: '#000000',
  logo: cdn => `${cdn}/connections/CONNECTION_SUMUP.svg`,
  logoInverted: cdn => `${cdn}/connections/CONNECTION_SUMUP_WHITE.svg`,
  configNames: ['Subdomain', 'Username', 'Password', 'Vendor ID', `Sticker passthrough (${VALID_THING_PASSTHROUGHS.join('/')})`, 'Send order (Yes/No)', 'Outlet'],
  configDefaults: ['', '', '', '', 'Name', 'No', ''],
  eventHooks: {
    'SESSION_CART_PAY': eventHookLogic
  },
  methods: {
    getLocations: {
      name: 'Pull',
      uiPlaces: ['products'],
      logic: async ({ connectionContainer, config, body }) => {
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

        const suProductCategoriesData = await makeRequest(
          {
            'Authorization': `Bearer ${token}`
          },
          'GET',
          'https://api.thegoodtill.com/api/categories'
        )
        assert(suProductCategoriesData.status)
        const { data: suProductCategories } = suProductCategoriesData

        const { rdic, user } = connectionContainer
        const existingPcs = await connectionContainer.getProductCategories(rdic, user, { connection: 'CONNECTION_SUMUP' })

        const startTime = getNow()
        const pcAsyncFunctions = suProductCategories.map((suPc, nextIPc) => {
          return () => {
            const existingPc = existingPcs.find(pc => pc.theirId === suPc.id)
            if (existingPc) {
              existingPc.name = suPc.name
              existingPc.description = suPc.description || ''
              existingPc.isEnabled = suPc.active === 1
              return connectionContainer.updateProductCategory(existingPc, ['name', 'description', 'is_enabled'])
            } else {
              return connectionContainer.createProductCategory(
                {
                  name: suPc.name,
                  userId: user.id,
                  theirId: suPc.id,
                  description: suPc.description || '',
                  createdAt: startTime + nextIPc,
                  connection: 'CONNECTION_SUMUP',
                  isEnabled: suPc.active === 1
                },
                user
              )
            }
          }
        })

        await asyncSeries(pcAsyncFunctions)

        // createEvent: [AsyncFunction: createEvent],
        // getProducts: [AsyncFunction: getProducts],
        // createProduct: [AsyncFunction: createProduct],
        // updateProduct: [AsyncFunction: updateProduct],
        // getProductCategories: [AsyncFunction: getProductCategories],
        // createProductCategory: [AsyncFunction: createProductCategory],
        // updateProductCategory: [AsyncFunction: updateProductCategory]

        return 'All ok!'
      }
    }
  }
})
