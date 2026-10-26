const { assert } = require('@stickyto/openbox-node-utils')
const Product = require('openbox-entities/entities/Product/Product')
const { hasFlatTax } = require('openbox-entities/tax')
const Connection = require('../Connection')

const API_HOST = 'https://api.tevalis.com'

function integer (value, label, min = 1) {
  assert((typeof value === 'string' && /^\d+$/.test(value)) || typeof value === 'number', `${label} must be an integer.`)
  const number = Number(value)
  assert(Number.isInteger(number) && number >= min && number <= 2147483647, `${label} must be an integer between ${min} and 2147483647.`)
  return number
}

function money (value) {
  assert(Number.isSafeInteger(value) && value >= 0, 'Prices and totals must be non-negative amounts in minor currency units.')
  return value / 100
}

function settings (config) {
  const [companyId, guid, devId, guid2, siteId, terminal, priceGroupId, salesArea, discountReasonId] = config
  assert(typeof guid === 'string' && guid.trim(), 'Tevalis GUID is required.')
  assert(typeof devId === 'string' && devId.trim(), 'Tevalis developer ID is required.')
  return {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', CompanyId: String(integer(companyId, 'Company ID')), GUID: guid, DevID: devId },
    guid2,
    siteId: integer(siteId, 'Site ID'),
    terminal,
    priceGroupId: priceGroupId === '' || priceGroupId === undefined ? undefined : integer(priceGroupId, 'Price group ID'),
    salesArea,
    discountReasonId
  }
}

async function request (path, config, body) {
  const method = body === undefined ? 'GET' : 'POST'
  const headers = { ...config.headers }
  if (method === 'POST') {
    assert(typeof config.guid2 === 'string' && config.guid2.trim(), 'Tevalis GUID2 is required for placing orders.')
    headers.GUID2 = config.guid2.trim()
  }
  const res = await fetch(`${API_HOST}/${path}`, {
    method,
    headers,
    signal: AbortSignal.timeout(30000),
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  const text = await res.text()
  assert(res.ok, `Tevalis ${method} /${path} returned ${res.status}: ${text}`)
  try {
    return JSON.parse(text)
  } catch (_) {
    throw new Error(`Tevalis ${method} /${path} returned invalid JSON.`)
  }
}

async function eventHookLogic (config, connectionContainer) {
  const { rdic, user, application, thing, payment, customData, createEvent } = connectionContainer
  if (!application || customData.cart.length === 0) return

  const eventData = { userId: user.id, paymentId: payment.id, applicationId: application.id, thingId: thing ? thing.id : undefined }
  let orderId
  try {
    const options = settings(config)
    assert(typeof options.guid2 === 'string' && options.guid2.trim(), 'Tevalis GUID2 is required for placing orders.')
    const tenderId = integer(application.theirId, `External system ID (Tevalis tender type ID) for flow '${application.name}'`)
    const total = payment.total
    const tip = payment.tip || 0
    const discount = payment.discount || 0
    money(total)
    money(tip)
    money(discount)
    const discountReasonId = discount > 0 ? integer(options.discountReasonId, 'Discount reason type ID') : undefined

    const useFlatTax = hasFlatTax(user.flatTax)
    const cartProducts = (useFlatTax ? [] : await rdic.get('datalayerRelational').read('products', { id: customData.cart.map(item => item.productId), user_id: user.id }))
      .map(row => new Product().fromDatalayerRelational(row))
    let cartTotal = 0
    const orderItems = customData.cart.map(item => {
      let theirId = item.productTheirId
      if (!theirId) {
        const selectedOptions = (item.questions || []).flatMap(question => {
          const answers = Array.isArray(question.answer) ? question.answer : [question.answer]
          return (question.options || []).filter(option => answers.includes(option.name) && option.theirId)
        })
        assert(selectedOptions.length <= 1, `Multiple Tevalis price IDs selected for '${item.productName}'.`)
        theirId = selectedOptions[0] && selectedOptions[0].theirId
      }
      const priceId = integer(theirId, `Tevalis price ID for '${item.productName}'`)
      const quantity = integer(item.quantity, `Quantity for '${item.productName}'`)
      money(item.productPrice)
      const gross = item.productPrice * quantity
      money(gross)
      cartTotal += gross
      let vatRate = user.flatTax
      if (!useFlatTax) {
        const product = cartProducts.find(product => product.id === item.productId)
        assert(product, `Product '${item.productName}' could not be found to determine its VAT rate.`)
        const tags = product.tags.toArray().filter(tag => tag.startsWith('vat--'))
        assert(tags.length <= 1, `Product '${item.productName}' has conflicting VAT tags.`)
        const tag = tags[0]
        vatRate = !tag || tag === 'vat--no' ? 0 : tag === 'vat--125' ? 12.5 : Number(tag.slice(5))
      }
      assert(typeof vatRate === 'number' && Number.isFinite(vatRate) && vatRate >= 0 && vatRate <= 100, `Invalid VAT rate for '${item.productName}'.`)
      return {
        PriceId: priceId,
        ProductName: item.productName,
        Quantity: quantity,
        TotalGross: money(gross),
        VatRate: vatRate,
        ...(item.customNote ? { ItemNotes: [item.customNote] } : {})
      }
    })
    money(cartTotal)
    assert(cartTotal - discount + tip === total, 'Tevalis cart, discount and tip do not balance with the paid total.')

    const order = {
      SiteId: options.siteId,
      CustomerName: (typeof payment.name === 'string' && payment.name.trim()) || 'Sticky',
      OrderItems: orderItems,
      Tenders: [{ TenderTypeID: tenderId, Amount: money(total) }],
      ThirdPartyReference: payment.id,
      ThirdPartyTransactionID: payment.id,
      SCAmount: 0,
      Gratuity: money(tip)
    }
    assert(order.CustomerName.length <= 200, 'Tevalis customer name must not exceed 200 characters.')
    if (options.priceGroupId !== undefined) order.PriceGroupID = options.priceGroupId
    if (options.salesArea) order.SalesArea = options.salesArea
    if (thing && thing.theirId) order.TableNumber = integer(thing.theirId, 'Table number', 0)
    if (discount > 0) order.Discount = { ReasonTypeId: discountReasonId, Value: money(discount), IsPercent: false }
    if (payment.extra) order.BillNotes = payment.extra

    const terminalQuery = options.terminal ? `?Terminal=${encodeURIComponent(options.terminal)}` : ''
    const result = await request(`PlaceOrder/CreateOrder${terminalQuery}`, options, order)
    assert(result && Number.isInteger(result.ApiOrderID) && result.ApiOrderID > 0 && !result.IsCancelled, `Tevalis did not create the order: ${JSON.stringify(result)}`)
    orderId = result.ApiOrderID
  } catch (error) {
    await createEvent({ ...eventData, type: 'CONNECTION_BAD', customData: { id: 'CONNECTION_TEVALIS', message: error.message } })
    return
  }

  // CreateOrder queues the order; this is not confirmation that the POS has processed it.
  await createEvent({ ...eventData, type: 'CONNECTION_GOOD', customData: { id: 'CONNECTION_TEVALIS', theirId: String(orderId) } })
}

module.exports = new Connection({
  id: 'CONNECTION_TEVALIS',
  type: 'CONNECTION_TYPE_POINT_OF_SALE',
  name: 'Tevalis',
  color: '#003C5F',
  logo: cdn => `${cdn}/connections/CONNECTION_TEVALIS.svg`,
  configNames: ['Company ID', 'GUID', 'Developer ID', 'GUID2', 'Site ID', 'Terminal name (optional)', 'Price group ID (optional)', 'Sales area (optional)', 'Discount reason type ID (optional)'],
  configDefaults: ['', '', '', '', '', '', '', '', ''],
  methods: {
    getLocations: {
      name: 'Pull',
      uiPlaces: ['products'],
      logic: async ({ config }) => {
        const options = settings(config)
        const query = new URLSearchParams({ SiteID: String(options.siteId), IsActive: 'true' })
        if (options.priceGroupId !== undefined) query.set('PriceGroup', String(options.priceGroupId))
        const result = await request(`v3/ProductCatalogue?${query}`, options)
        assert(result && result.SiteID === options.siteId && Array.isArray(result.Products), 'Tevalis returned an invalid product catalogue.')
        const products = new Map()
        for (const product of result.Products) {
          assert(Array.isArray(product.Prices), 'Tevalis returned an invalid price list.')
          for (const price of product.Prices) {
            if (options.priceGroupId !== undefined && price.PriceGroupID !== options.priceGroupId) continue
            const id = String(integer(price.PriceId, 'Price ID'))
            const name = price.ProductName || product.ProductName
            assert(typeof name === 'string' && name.trim(), `Tevalis price ${id} has no product name.`)
            products.set(id, { id, name, measureId: price.MeasureID })
          }
        }
        const prices = Array.from(products.values())
        const nameCounts = new Map()
        prices.forEach(price => nameCounts.set(price.name, (nameCounts.get(price.name) || 0) + 1))
        const needsMeasures = prices.some(price => nameCounts.get(price.name) > 1 && price.measureId !== undefined)
        let measures = new Map()
        if (needsMeasures) {
          const result = await request(`Measures/${options.siteId}`, options)
          assert(result && result.SiteID === options.siteId && Array.isArray(result.Measures), 'Tevalis returned an invalid measure list.')
          measures = new Map(result.Measures.map(measure => [measure.MeasureID, measure.ShortName || measure.Name]))
        }
        return prices.map(({ id, name, measureId }) => {
          const measure = nameCounts.get(name) > 1 && measures.get(measureId)
          return { id, name: measure ? `${name} (${measure})` : name }
        })
      }
    }
  },
  eventHooks: {
    'SESSION_CART_PAY': eventHookLogic
  }
})
