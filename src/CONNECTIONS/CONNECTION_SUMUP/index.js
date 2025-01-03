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
      paymentId: event.paymentId,
      applicationId: application ? application.id : undefined,
      thingId: thing ? thing.id : undefined,
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
    if (_.questions.length === 0) {
      const toAddToRunningTotal = Math.floor((_.productPrice / 100) * _.quantity)
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
      _.questions.forEach(question => {
        const foundOption = question.options.find(o => o.name === question.answer)
        if (!foundOption) {
          return
        }
        if (!foundOption.theirId) {
          return
        }
        const toAddToRunningTotal = Math.floor((_.productPrice / 100) * _.quantity)
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
    // {
    //   "questions": [
    //     {
    //       "type": "option",
    //       "options": [
    //         {
    //           "name": "7up 300ml",
    //           "delta": 0,
    //           "forSale": true,
    //           "theirId": "2d5f90c1-e26c-482e-9461-786c01c6d672",
    //           "subProducts": []
    //         },
    //         {
    //           "name": "7up 500ml",
    //           "delta": 100,
    //           "forSale": true,
    //           "theirId": "61537715-0677-4a06-baf1-5dc137d4a5fc",
    //           "subProducts": []
    //         }
    //       ],
    //       "question": " ",
    //       "answer": "7up 300ml",
    //       "connectionHandleAsProduct": true
    //     }
    //   ]
    // }
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
  })

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
    'notes': finalNote,
    'user': {
      name: typeof payment.name === 'string' && payment.name.length > 0 ? payment.name : undefined,
      phone: typeof payment.phone === 'string' && payment.phone.length > 0 ? payment.phone : undefined,
    },
    'sales_items': salesItems,
    'payments': [
      {
        'method': 'CARD',
        'amount': runningTotal.toFixed(2)
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
        'Outlet-Id': '1a6ea3e2-d368-4912-bed4-c828c31eecb0'
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

function getFinalName (___) {
  return ___.display_name || ___.product_name
}

function getFinalPrice (___) {
  return Math.floor(parseFloat(___.selling_price) * 100)
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

        const { rdic, user } = connectionContainer
        const startTime = getNow()

        // const suProductCategoriesData = await makeRequest(
        //   {
        //     'Authorization': `Bearer ${token}`
        //   },
        //   'GET',
        //   'https://api.thegoodtill.com/api/categories'
        // )
        // assert(suProductCategoriesData.status)
        // const { data: suProductCategories } = suProductCategoriesData
        // const existingPcs = await connectionContainer.getProductCategories(rdic, user, { connection: 'CONNECTION_SUMUP' })
        // const pcAsyncFunctions = suProductCategories.map((suPc, nextIPc) => {
        //   return () => {
        //     const existingPc = existingPcs.find(pc => pc.theirId === suPc.id)
        //     if (existingPc) {
        //       existingPc.name = suPc.name
        //       existingPc.description = suPc.description || ''
        //       existingPc.isEnabled = suPc.active === 1
        //       return connectionContainer.updateProductCategory(existingPc, ['name', 'description', 'is_enabled'])
        //     } else {
        //       return connectionContainer.createProductCategory(
        //         {
        //           name: suPc.name,
        //           userId: user.id,
        //           theirId: suPc.id,
        //           description: suPc.description || '',
        //           createdAt: startTime + nextIPc,
        //           connection: 'CONNECTION_SUMUP',
        //           isEnabled: suPc.active === 1
        //         },
        //         user
        //       )
        //     }
        //   }
        // })
        // await asyncSeries(pcAsyncFunctions)

        const suProductsData = await makeRequest(
          {
            'Authorization': `Bearer ${token}`,
            'Outlet-Id': foundOutlet.id
          },
          'GET',
          'https://api.thegoodtill.com/api/products'
        )
        assert(suProductsData.status)
        let { data: suProducts } = suProductsData
        suProducts = suProducts.filter(_ => _.outlet_id === foundOutlet.id)
        // require('fs').writeFileSync('./products.json', JSON.stringify(suProducts, null, 2), 'utf-8')

        const existingPs = await connectionContainer.getProducts(rdic, user, { connection: 'CONNECTION_SUMUP' })

        const pAsyncFunctions = suProducts.map((suP, nextIP) => {
          const finalName = getFinalName(suP)
          const finalPrice = getFinalPrice(suP)
          const finalMedia = suP.image ? [{ type: 'image', url: suP.image }] : []

          const suSubProducts = suProducts.filter(_suPQ => _suPQ.parent_product_id === suP.id)

          const finalQuestions = suSubProducts.length > 0 ? [
            {
              type: 'option',
              question: ' ',
              connectionHandleAsProduct: true,
              options: suSubProducts.map(suSubP => ({
                name: getFinalName(suSubP),
                delta: getFinalPrice(suSubP) - finalPrice,
                forSale: suSubP.active === 1,
                theirId: suSubP.id
              })),
              answer: getFinalName(suSubProducts[0]),
            }
          ] : []

          if (suP.parent_product_id) {
            // it's a modifier
            return () => {}
          }

          return () => {
            const existingP = existingPs.find(p => p.theirId === suP.id)
            if (existingP) {
              existingP.patch({
                name: finalName,
                isEnabled: suP.active === 1,
                price: finalPrice,
                questions: finalQuestions,
                media: finalMedia
              })
              return connectionContainer.updateProduct(existingP, ['name', 'is_enabled', 'price', 'questions', 'media'])
            } else {
              return connectionContainer.createProduct(
                {
                  userId: user.id,
                  createdAt: startTime + nextIP,
                  connection: 'CONNECTION_SUMUP',
                  theirId: suP.id,
                  name: finalName,
                  isEnabled: suP.active === 1,
                  currency: user.currency,
                  price: finalPrice,
                  media: finalMedia,
                  questions: finalQuestions
                }
              )
            }
          }
        })
        await asyncSeries(pAsyncFunctions)

        return 'All ok!'
      }
    }
  }
})

// createEvent: [AsyncFunction: createEvent]
// getProducts: [AsyncFunction: getProducts]
// createProduct: [AsyncFunction: createProduct]
// updateProduct: [AsyncFunction: updateProduct]
// getProductCategories: [AsyncFunction: getProductCategories]
// createProductCategory: [AsyncFunction: createProductCategory]
// updateProductCategory: [AsyncFunction: updateProductCategory]

// "print_on_drink": 0,
// "print_on_other": 0,

// OUTLET KEYS
// id: 'UUID',
// outlet_name: 'WF - K & B',
// outlet_address: null,
// outlet_city: null,
// outlet_county: null,
// outlet_postcode: null,
// outlet_country: 'GBR',
// store_tag: 'WF',
// status: 'Active',
// active: 1

// PRODUCT KEYS
// "id": "UUID",
// "product_name": "V ",
// "product_sku": "V_B__CAPS",
// "display_name": "V B",
// "parent_product_id": null,
// "purchase_price": "0.000",
// "supplier_purchase_price": "0.000",
// "outlet_id": "UUID",
// "shareable": 1,
// "has_variant": 1,
// "active": 1,
// "category_id": "UUID",
// "brand_id": null,
// "supplier_id": null,
// "has_ingredient_stock": 0,
// "take_stock_from_parent": 0,
// "stock_quantifier": "1.000",
// "unit_conversion": "1.000",
// "store_unit": null,
// "supplier_unit": null,
// "selling_price": "2.500",
// "track_inventory": 1,
// "inventory": null,
// "alert_on": 0,
// "alert_below": null,
// "delivery_reorder_on": 0,
// "delivery_reorder_point": null,
// "print_on_receipt": 1,
// "print_on_kitchen": 0,
// "ticket_printer_1": 0,
// "ticket_printer_2": 0,
// "ticket_printer_3": 0,
// "ticket_printer_4": 0,
// "min_stock": "0.000",
// "takeaway_override_price": 0,
// "takeaway_selling_price": "0.000",
// "oc_override_price": 0,
// "oc_selling_price": "0.000",
// "oc_collection_selling_price": null,
// "oc_delivery_selling_price": null,
// "oc_dropoff_selling_price": null,
// "takeaway_vat_code": null,
// "oc_collection_vat_code": null,
// "oc_delivery_vat_code": null,
// "oc_dropoff_vat_code": null,
// "created_at": "2024-08-28 13:37:18",
// "updated_at": "2024-08-28 13:37:18",
// "top_level_product": true,
// "can_change_product": true,
// "image": "URL"
