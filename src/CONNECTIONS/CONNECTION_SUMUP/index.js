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
      _.questions.forEach(question => {
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
          'The Bridge Restaurant': 'fe6a4504-1b14-4664-abd5-aed5dcf5bcf8'
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
  configNames: ['Subdomain', 'Username', 'Password', 'Vendor ID', `Sticker passthrough (${VALID_THING_PASSTHROUGHS.join('/')})`, 'Send order (Yes/No)', 'Outlet', 'Pull external orders (Yes/No)'],
  configDefaults: ['', '', '', '', 'Name', 'No', '', 'No'],
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
  },
  // Pull external orders (Yes/No)
  crons: [
    {
      id: 'generic',
      frequency: '* * * * *',
      logic: async function (user, cronContainer) {
        const { config } = user.connections.find(c => c.id === 'CONNECTION_SUMUP')
        let [cSubdomain, cUsername, cPassword, cVendorId, cThingPassthrough, cSendOrder, cOutletName, _pullExternalPayments] = config
        const pullExternalPayments = _pullExternalPayments === 'Yes'
        if (!pullExternalPayments) {
          return
        }
        
        try {
          const allPsToday = await cronContainer.getProducts(rdic, user, { connection: 'CONNECTION_SUMUP' })
          console.warn('xxx allPsToday', allPsToday)

          const token = await getToken(cSubdomain, cUsername, cPassword)

          global.rdic.logger.log({ user }, `[CONNECTION_SUMUP] [crons->pullExternalPayments] -> user ID ${user.id}`)
  
          const outletsData = await makeRequest(
            {
              'Authorization': `Bearer ${token}`
            },
            'GET',
            'https://api.thegoodtill.com/api/outlets'
          )
          assert(outletsData.status, '[Pull external orders] Failed outletsData.status assert (very bad)')
          const { data: outlets } = outletsData
  
          const foundOutlet = outlets.find(o => o.outlet_name === cOutletName)
          assert(foundOutlet, `[Pull external orders] There is no outlet with name "${cOutletName}". The outlet names are:\n\n${outlets.map(o => o.outlet_name).join('\n\n')}`)

          const allExternalPayments = await makeRequest(
            {
              'Authorization': `Bearer ${token}`,
              'Outlet-Id': foundOutlet.id
            },
            'GET',
            `https://api.thegoodtill.com/api/external/get_sales?timezone=utc&from=2025-01-15 00:00:00&to=2025-01-16 00:00:00`
          )
          assert(allExternalPayments.status, '[Pull external orders] Failed allExternalPayments.status assert (very bad)')

          const interestingExternalPayments = allExternalPayments.data.filter(_ => _.sale_type !== 'WEB')

          console.warn('xxx', interestingExternalPayments.length)
          require('fs').writeFileSync('./dump.json', JSON.stringify(allExternalPayments.data, null, 2), 'utf-8')

          const dlr = rdic.get('datalayerRelational')
          dlr.deleteMany('payments', { user_id: user.id })

          // {
          //   "product_name": "Budweiser NRB",
          //   "product_sku": "BUDWEISER_1",
          //   "account_code": null,
          //   "category_name": "Bottled Beer",
          //   "quantity": 1,
          //   "discount_id": null,
          //   "vat_rate_id": "6bf79c86-1dd7-4b74-8e47-7da0466bb0eb",
          //   "vat_rate": "20.000",
          //   "product_id": "104544c4-00bd-4891-b020-4ecb5162c7b2",
          //   "line_discount": 0,
          //   "sales_discount": 0,
          //   "total_inc_vat": 6,
          //   "vat": 1
          // },
          // {
          //   "product_name": "Corona NRB",
          //   "product_sku": "CORONA",
          //   "account_code": null,
          //   "category_name": "Bottled Beer",
          //   "quantity": 1,
          //   "discount_id": null,
          //   "vat_rate_id": "6bf79c86-1dd7-4b74-8e47-7da0466bb0eb",
          //   "vat_rate": "20.000",
          //   "product_id": "0fd73431-8f32-43c7-a2b9-a8a601c9c894",
          //   "line_discount": 0,
          //   "sales_discount": 0,
          //   "total_inc_vat": 6,
          //   "vat": 1
          // }



          // [
          //   {
          //     "productId": "6253b60a-e504-4cf5-a646-3b228a323e30",
          //     "productName": "Caesar Salad (NGCI)",
          //     "productPrice": 1050,
          //     "productCurrency": "GBP",
          //     "productTheirId": "e434b9b7-43c2-47b9-9e9d-ea4af204a10b",
          //     "quantity": 1,
          //     "questions": [
          //       {
          //         "type": "options",
          //         "options": [
          //           {
          //             "name": "Add Griddled Chicken Breast",
          //             "delta": 400,
          //             "subProducts": [],
          //             "forSale": true,
          //             "theirId": "21880f14-1d2b-4dad-b12a-9489b0bd1687"
          //           }
          //         ],
          //         "question": "Add Griddled Chicken Breast",
          //         "answer": [],
          //         "connectionHandleAsProduct": false,
          //         "checklistMaximum": 1,
          //         "theirId": ""
          //       }
          //     ]
          //   },
          //   {
          //     "productId": "6253b60a-e504-4cf5-a646-3b228a323e30",
          //     "productName": "Caesar Salad (NGCI)",
          //     "productPrice": 1450,
          //     "productCurrency": "GBP",
          //     "productTheirId": "e434b9b7-43c2-47b9-9e9d-ea4af204a10b",
          //     "quantity": 1,
          //     "questions": [
          //       {
          //         "type": "options",
          //         "options": [
          //           {
          //             "name": "Add Griddled Chicken Breast",
          //             "delta": 400,
          //             "subProducts": [],
          //             "forSale": true,
          //             "theirId": "21880f14-1d2b-4dad-b12a-9489b0bd1687"
          //           }
          //         ],
          //         "question": "Add Griddled Chicken Breast",
          //         "answer": [
          //           "Add Griddled Chicken Breast"
          //         ],
          //         "connectionHandleAsProduct": false,
          //         "checklistMaximum": 1,
          //         "theirId": ""
          //       }
          //     ]
          //   }
          // ]


          
          for (let i = 0; i < interestingExternalPayments.length; i++) {
            const thisPaymentFromSu = interestingExternalPayments[i]
            let existingPayment = await dlr.readOne('payments', { user_id: user.id, user_payment_id: thisPaymentFromSu.sales_id })
            if (!existingPayment) {
              const newPayment = new Payment(
                {
                  userId: user.id,
                  userPaymentId: thisPaymentFromSu.sales_id,
                  total: Math.floor(thisPaymentFromSu.total_inc_vat * 100),
                  paymentGatewayId: thisPaymentFromSu.receipt_no,
                  newStatusDone: false,
                  createdAt: 1737158400,
                  cart: thisPaymentFromSu.items.map(suItem => {
                    const foundExistingPc = allPsToday.find(pToday => pToday.theirId === suItem.product_id)
                    return {
                      // productId: foundExistingPc ? foundExistingPc.id : undefined,
                      productName: suItem.product_name,
                      productPrice: Math.floor(suItem.total_inc_vat / suItem.quantity),
                      productCurrency: user.currency,
                      quantity: suItem.quantity,
                      productTheirId: suItem.product_id,
                      questions: []
                    }
                  })
                },
                user
              )
              newPayment.sessionPaidAt = 1735693261
              await dlr.create('payments', newPayment.toDatalayerRelational())
            }
          }

          // const { rdic } = connectionContainer
          // const startTime = getNow()

        } catch({ message }) {
          const payload = {
            type: 'CONNECTION_BAD',
            userId: user.id,
            customData: { id: 'CONNECTION_SUMUP', message }
          }
          await cronContainer.createEvent(payload)
          global.rdic.logger.error({ user }, { message })
        }
      }
    }
  ],
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
