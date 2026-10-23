const connection = require('./index')
const hook = connection.eventHooks.SESSION_CART_PAY
const pull = config => connection.methods.getLocations.logic({ config })
const config = ['2699', 'guid', 'developer', 'write-guid', '10979', 'Sticky & POS', '2', 'Restaurant', '8']
const originalFetch = global.fetch

function response (body, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => typeof body === 'string' ? body : JSON.stringify(body) }
}

let container
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue(response({ ApiOrderID: 123, IsCancelled: false }))
  container = {
    rdic: { get: jest.fn().mockReturnValue({ read: jest.fn().mockResolvedValue([{ id: 'product', media: '[]', questions: '[]', tags_v2: ['vat--20'] }]) }) },
    user: { id: 'user' },
    application: { id: 'flow', name: 'Shop', theirId: '3' },
    thing: { id: 'thing', theirId: '12' },
    payment: { id: 'a0480c28-e11b-4fb6-83ce-0b8733851417', total: 1200, name: ' Alex ', extra: 'Call on arrival', onSessionFail: jest.fn() },
    customData: { cart: [{ productId: 'product', productTheirId: '987654', productName: 'Coffee', quantity: 2, productPrice: 600, customNote: 'Extra hot' }] },
    createEvent: jest.fn().mockResolvedValue()
  }
})
afterEach(() => { global.fetch = originalFetch })

it('submits a paid cart with write authentication, line totals, VAT, tender and table mapping', async () => {
  await hook(config, container)
  expect(fetch).toHaveBeenCalledTimes(1)
  const [url, request] = fetch.mock.calls[0]
  expect(url).toBe('https://api.tevalis.com/PlaceOrder/CreateOrder?Terminal=Sticky%20%26%20POS')
  expect(request).toMatchObject({
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', CompanyId: '2699', GUID: 'guid', DevID: 'developer', GUID2: 'write-guid' },
    signal: expect.any(AbortSignal)
  })
  expect(JSON.parse(request.body)).toEqual({
    SiteId: 10979, CustomerName: 'Alex', PriceGroupID: 2, SalesArea: 'Restaurant', TableNumber: 12,
    OrderItems: [{ PriceId: 987654, ProductName: 'Coffee', Quantity: 2, TotalGross: 12, VatRate: 20, ItemNotes: ['Extra hot'] }],
    Tenders: [{ TenderTypeID: 3, Amount: 12 }], SCAmount: 0, Gratuity: 0,
    ThirdPartyReference: container.payment.id, ThirdPartyTransactionID: container.payment.id, BillNotes: 'Call on arrival'
  })
  expect(container.createEvent).toHaveBeenCalledTimes(1)
  expect(container.createEvent).toHaveBeenCalledWith({
    type: 'CONNECTION_GOOD', userId: 'user', paymentId: container.payment.id, applicationId: 'flow', thingId: 'thing',
    customData: { id: 'CONNECTION_TEVALIS', theirId: '123' }
  })
  expect(container.payment.onSessionFail).not.toHaveBeenCalled()
})

it('balances bill discounts and tips using the paid total', async () => {
  Object.assign(container.payment, { total: 1280, tip: 200, discount: 120 })
  await hook(config, container)
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
    Discount: { ReasonTypeId: 8, IsPercent: false, Value: 1.2 }, Gratuity: 2,
    Tenders: [{ TenderTypeID: 3, Amount: 12.8 }]
  })
})

it('supports free products, untagged VAT, no table and optional configuration', async () => {
  container.payment = { ...container.payment, total: 0, name: undefined, extra: undefined }
  container.customData.cart[0].productPrice = 0
  delete container.customData.cart[0].customNote
  container.thing = undefined
  container.rdic.get().read.mockResolvedValue([{ id: 'product', media: '[]', questions: '[]', tags_v2: [] }])
  await hook(config.slice(0, 6), container)
  const order = JSON.parse(fetch.mock.calls[0][1].body)
  expect(order).toMatchObject({ CustomerName: 'Sticky', OrderItems: [{ TotalGross: 0, VatRate: 0 }], Tenders: [{ Amount: 0 }] })
  expect(order).not.toHaveProperty('PriceGroupID')
  expect(order).not.toHaveProperty('SalesArea')
  expect(order).not.toHaveProperty('TableNumber')
  expect(order).not.toHaveProperty('Discount')
})

it.each([12.5, 20])('uses account VAT %s without loading products', async rate => {
  container.user.flatTax = rate
  await hook(config, container)
  expect(container.rdic.get).not.toHaveBeenCalled()
  expect(JSON.parse(fetch.mock.calls[0][1].body).OrderItems[0].VatRate).toBe(rate)
})

it('supports the fractional product VAT tag', async () => {
  container.rdic.get().read.mockResolvedValue([{ id: 'product', media: '[]', questions: '[]', tags_v2: ['vat--125'] }])
  await hook(config, container)
  expect(JSON.parse(fetch.mock.calls[0][1].body).OrderItems[0].VatRate).toBe(12.5)
})

it.each(['empty cart', 'missing application'])('skips %s', async scenario => {
  if (scenario === 'empty cart') container.customData.cart = []
  else container.application = undefined
  await hook(config, container)
  expect(fetch).not.toHaveBeenCalled()
  expect(container.createEvent).not.toHaveBeenCalled()
})

it.each([
  ['missing price mapping', c => { c.customData.cart[0].productTheirId = '' }],
  ['invalid price mapping', c => { c.customData.cart[0].productTheirId = '123abc' }],
  ['overflowing price ID', c => { c.customData.cart[0].productTheirId = '2147483648' }],
  ['invalid tender', c => { c.application.theirId = '' }],
  ['invalid table', c => { c.thing.theirId = 'Table 12' }],
  ['fractional quantity', c => { c.customData.cart[0].quantity = 1.5 }],
  ['negative price', c => { c.customData.cart[0].productPrice = -100 }],
  ['unbalanced payment', c => { c.payment.total = 100 }],
  ['missing product', c => { c.rdic.get().read.mockResolvedValue([]) }],
  ['conflicting VAT', c => { c.rdic.get().read.mockResolvedValue([{ id: 'product', media: '[]', questions: '[]', tags_v2: ['vat--0', 'vat--20'] }]) }]
])('reports %s before submitting an order', async (_, change) => {
  change(container)
  await hook(config, container)
  expect(fetch).not.toHaveBeenCalled()
  expect(container.createEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'CONNECTION_BAD' }))
})

it.each([0, 1, 2, 3, 4])('requires order configuration field %s', async field => {
  const invalid = [...config]
  invalid[field] = ''
  await hook(invalid, container)
  expect(fetch).not.toHaveBeenCalled()
  expect(container.createEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'CONNECTION_BAD' }))
})

it('normalizes GUID2 casing and whitespace to avoid Tevalis write authentication failures', async () => {
  const sandboxConfig = [...config]
  sandboxConfig[3] = ' B2d67bca-b1d5-4687-bed5-ef18dd351f99 '
  await hook(sandboxConfig, container)
  expect(fetch.mock.calls[0][1].headers.GUID2).toBe('b2d67bca-b1d5-4687-bed5-ef18dd351f99')
})

it('allows Tevalis to select the terminal when none is configured', async () => {
  const sandboxConfig = [...config]
  sandboxConfig[5] = ''
  await hook(sandboxConfig, container)
  expect(fetch.mock.calls[0][0]).toBe('https://api.tevalis.com/PlaceOrder/CreateOrder')
  expect(container.createEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'CONNECTION_GOOD' }))
})

it('requires a discount reason for discounted orders', async () => {
  container.payment.discount = 100
  container.payment.total = 1100
  await hook(config.slice(0, 8), container)
  expect(fetch).not.toHaveBeenCalled()
  expect(container.createEvent).toHaveBeenCalledWith(expect.objectContaining({
    type: 'CONNECTION_BAD', customData: { id: 'CONNECTION_TEVALIS', message: expect.stringContaining('Discount reason type ID') }
  }))
})

it.each([
  response('Unauthorized', 401), response('Forbidden', 403), response('Unavailable', 503),
  response('not JSON'), response({}), response({ ApiOrderID: 0 }), response({ ApiOrderID: 123, IsCancelled: true })
])('reports unsuccessful order responses without failing the payment or retrying', async res => {
  fetch.mockResolvedValue(res)
  await hook(config, container)
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(container.createEvent).toHaveBeenCalledTimes(1)
  expect(container.createEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'CONNECTION_BAD', paymentId: container.payment.id }))
  expect(container.payment.onSessionFail).not.toHaveBeenCalled()
})

it('records network failures', async () => {
  fetch.mockRejectedValue(new Error('Network unavailable'))
  await hook(config, container)
  expect(container.createEvent).toHaveBeenCalledWith(expect.objectContaining({
    type: 'CONNECTION_BAD', customData: { id: 'CONNECTION_TEVALIS', message: 'Network unavailable' }
  }))
})

it('does not report an order failure if writing the success event fails', async () => {
  container.createEvent.mockRejectedValue(new Error('Database unavailable'))
  await expect(hook(config, container)).rejects.toThrow('Database unavailable')
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(container.createEvent).toHaveBeenCalledTimes(1)
  expect(container.createEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'CONNECTION_GOOD' }))
})

function catalogue () {
  return { SiteID: 10979, Products: [
    { ProductId: 10, ProductName: 'Coffee', Prices: [{ PriceId: 101, PriceGroupID: 2, ProductName: 'Coffee cup' }, { PriceId: 102, PriceGroupID: 3 }] },
    { ProductId: 20, ProductName: 'Tea', Prices: [{ PriceId: 201, PriceGroupID: 2 }] }
  ] }
}

it('exposes Pull on products and returns flat price mappings using read-only headers', async () => {
  fetch.mockResolvedValueOnce(response(catalogue()))
  const readConfig = [...config]
  readConfig[3] = ''
  expect(connection.type).toBe('CONNECTION_TYPE_POINT_OF_SALE')
  expect(connection.methods.getLocations.uiPlaces).toEqual(['products'])
  const result = await pull(readConfig)
  expect(result).toEqual([{ id: '101', name: 'Coffee cup' }, { id: '201', name: 'Tea' }])
  expect(fetch.mock.calls[0][0]).toBe('https://api.tevalis.com/v3/ProductCatalogue?SiteID=10979&IsActive=true&PriceGroup=2')
  expect(fetch.mock.calls[0][1].method).toBe('GET')
  expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('GUID2')
  expect(fetch.mock.calls[0][1]).not.toHaveProperty('body')
  expect(container.rdic.get).not.toHaveBeenCalled()
  container.customData.cart[0].productTheirId = result[0].id
  await hook(config, container)
  expect(JSON.parse(fetch.mock.calls[1][1].body).OrderItems[0].PriceId).toBe(101)
})

it('returns every price variant without a price group and deduplicates fallback prices', async () => {
  const body = catalogue()
  body.Products[0].Prices.push({ PriceId: 101, PriceGroupID: 4, ProductName: 'Coffee cup' })
  fetch.mockResolvedValue(response(body))
  expect(await pull(config.slice(0, 6))).toEqual([{ id: '101', name: 'Coffee cup' }, { id: '102', name: 'Coffee' }, { id: '201', name: 'Tea' }])
  expect(fetch.mock.calls[0][0]).toBe('https://api.tevalis.com/v3/ProductCatalogue?SiteID=10979&IsActive=true')
})

it('returns an empty catalogue as an empty array', async () => {
  fetch.mockResolvedValue(response({ SiteID: 10979, Products: [] }))
  await expect(pull(config)).resolves.toEqual([])
})

it('distinguishes real sandbox serving sizes while preserving order PriceIds', async () => {
  fetch.mockReset()
    .mockResolvedValueOnce(response(require('./fixtures/catalogue.json')))
    .mockResolvedValueOnce(response(require('./fixtures/measures.json')))
  const products = await pull(config)
  expect(products).toEqual([
    { id: '4', name: 'Coke (284ml)' },
    { id: '5', name: 'Coke (568ml)' },
    { id: '25', name: 'Cheese Burger' }
  ])
  expect(fetch.mock.calls[1][0]).toBe('https://api.tevalis.com/Measures/10979')
  expect(fetch.mock.calls[1][1].headers).not.toHaveProperty('GUID2')
})

it('uses the measure name when its short name is empty', async () => {
  const measures = structuredClone(require('./fixtures/measures.json'))
  measures.Measures.find(measure => measure.MeasureID === 18).ShortName = ''
  fetch.mockReset()
    .mockResolvedValueOnce(response(require('./fixtures/catalogue.json')))
    .mockResolvedValueOnce(response(measures))
  expect((await pull(config))[0]).toEqual({ id: '4', name: 'Coke (284ml/50000ml)' })
})

it.each([response('Unavailable', 503), response({ SiteID: 123, Measures: [] }), response({ SiteID: 10979 })])('rejects failed or invalid measure reads', async res => {
  fetch.mockReset().mockResolvedValueOnce(response(require('./fixtures/catalogue.json'))).mockResolvedValueOnce(res)
  await expect(pull(config)).rejects.toThrow()
})

it.each([
  response('Could not find a default price group. Please contact Tevalis Support', 400),
  response('Unauthorized', 401), response('not JSON'), response({ SiteID: 123, Products: [] }),
  response({ SiteID: 10979 }), response({ SiteID: 10979, Products: [{ ProductName: 'Coffee' }] }),
  response({ SiteID: 10979, Products: [{ Prices: [{ PriceId: 0, PriceGroupID: 2, ProductName: 'Coffee' }] }] })
])('rejects failed or malformed catalogues', async res => {
  fetch.mockResolvedValue(res)
  await expect(pull(config)).rejects.toThrow()
})
