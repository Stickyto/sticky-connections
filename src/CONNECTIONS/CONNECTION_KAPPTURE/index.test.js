// Load the real Product entity without the unrelated application configuration imports.
jest.mock('openbox-entities', () => ({
  Product: jest.requireActual('openbox-entities/entities/Product/Product')
}))

const connection = require('./index')

const config = ['key', 'secret', '10', '2', '7']
const hook = connection.eventHooks.SESSION_CART_PAY
const originalFetch = global.fetch

function response (body, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => typeof body === 'string' ? body : JSON.stringify(body) }
}

let container
beforeEach(() => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce(response({ token: 'jwt' }))
    .mockResolvedValueOnce(response([{ id: 3, name: 'Sticky' }]))
    .mockResolvedValueOnce(response({ processCount: 1, createdProductIds: [] }))
  container = {
    rdic: { get: jest.fn().mockReturnValue({ read: jest.fn().mockResolvedValue([{ id: 'product', media: '[]', questions: '[]', tags_v2: ['vat--20'] }]) }) },
    user: { id: 'user' },
    application: { id: 'flow', name: 'Shop', theirId: '3' },
    thing: { id: 'thing', theirId: '12' },
    payment: { id: 'a0480c28-e11b-4fb6-83ce-0b8733851417', createdAt: 1737376496, total: 1200, onSessionFail: jest.fn().mockResolvedValue() },
    customData: { cart: [{ productId: 'product', productTheirId: '987654', productName: 'Coffee', quantity: 2, productPrice: 600 }] },
    createEvent: jest.fn().mockResolvedValue()
  }
})

afterEach(() => { global.fetch = originalFetch })

it('authenticates, validates the tender and submits the paid cart using the documented PUT schema', async () => {
  await hook(config, container)
  expect(fetch.mock.calls[0]).toEqual(['https://api.eu-west-1.kappture.com/auth', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': 'key' },
    body: JSON.stringify({ api_key: 'key', api_secret: 'secret' })
  }])
  expect(fetch.mock.calls[1][0]).toBe('https://api.eu-west-1.kappture.com/tender')
  const [url, request] = fetch.mock.calls[2]
  expect(url).toBe('https://api.eu-west-1.kappture.com/transaction')
  expect(request.method).toBe('PUT')
  expect(request.headers.authorization).toBe('Bearer jwt')
  const { orders: [order] } = JSON.parse(request.body)
  expect(order).toEqual({
    sessionId: 7, priceBandId: 2, terminalId: 10, reference: expect.any(Number),
    tableNumber: 12, openDateTime: new Date(1737376496000).toISOString(),
    products: [{ plu: 987654, productName: 'Coffee', productId: 0, productGroupId: 0, quantity: 2, price: 6, priceBandId: 2, taxRate: 20, taxValue: 1 }],
    tenders: [{ tenderId: 3, value: 12 }]
  })
  expect(order.reference).toBeGreaterThanOrEqual(0)
  expect(order.reference).toBeLessThanOrEqual(2147483647)
  expect(container.createEvent).toHaveBeenCalledWith(expect.objectContaining({
    type: 'CONNECTION_GOOD', paymentId: container.payment.id,
    customData: { id: 'CONNECTION_KAPPTURE', theirId: String(order.reference) }
  }))
  expect(container.payment.onSessionFail).not.toHaveBeenCalled()
})

it('uses UUID digits even with a payment reference, and supports zero VAT, free products and no table', async () => {
  container.payment.userPaymentId = '555101'
  container.payment.total = 0
  container.customData.cart[0].productPrice = 0
  container.rdic.get().read.mockResolvedValue([{ id: 'product', media: '[]', questions: '[]', tags_v2: ['vat--0'] }])
  container.thing = undefined
  await hook(config, container)
  const order = JSON.parse(fetch.mock.calls[2][1].body).orders[0]
  expect(order.reference).toBe(48028114)
  expect(order.tableNumber).toBeUndefined()
  expect(order.products[0]).toMatchObject({ price: 0, taxValue: 0, taxRate: 0 })
})

it('skips empty carts', async () => {
  container.customData = { cart: [] }
  await hook(config, container)
  expect(fetch).not.toHaveBeenCalled()
  expect(container.createEvent).not.toHaveBeenCalled()
})

it('skips an absent application', async () => {
  container.application = undefined
  await hook(config, container)
  expect(fetch).not.toHaveBeenCalled()
})

it.each(['', '123abc', '2147483648'])('rejects an invalid PLU %s before submitting anything', async plu => {
  container.customData.cart[0].productTheirId = plu
  await hook(config, container)
  expect(fetch).not.toHaveBeenCalled()
  expect(container.createEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'CONNECTION_BAD' }))
})

it('requires a configured session rather than sending the sample session', async () => {
  await hook(config.slice(0, 4), container)
  expect(fetch).not.toHaveBeenCalled()
  expect(container.createEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'CONNECTION_BAD' }))
})

it('rejects fractional tax rates unsupported by the Kappture schema', async () => {
  container.rdic.get().read.mockResolvedValue([{ id: 'product', media: '[]', questions: '[]', tags_v2: ['vat--125'] }])
  await hook(config, container)
  expect(fetch).not.toHaveBeenCalled()
  expect(container.createEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'CONNECTION_BAD' }))
})

it.each([
  [response('Unauthorized', 401)],
  [response({})],
  [response('not JSON')],
  [response({ token: 'jwt' }), response([{ id: 99 }])],
  [response({ token: 'jwt' }), response([{ id: 3 }]), response({ processCount: 0 })],
  [response({ token: 'jwt' }), response([{ id: 3 }]), response('Unavailable', 503)]
])('reports API failures without emitting success', async (...responses) => {
  fetch.mockReset()
  responses.forEach(res => fetch.mockResolvedValueOnce(res))
  await hook(config, container)
  expect(container.payment.onSessionFail).not.toHaveBeenCalled()
  expect(container.createEvent).toHaveBeenCalledTimes(1)
  expect(container.createEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'CONNECTION_BAD', paymentId: container.payment.id }))
})

it('records a network failure without failing the payment', async () => {
  fetch.mockReset().mockRejectedValue(new Error('Network unavailable'))
  await hook(config, container)
  expect(container.payment.onSessionFail).not.toHaveBeenCalled()
  expect(container.createEvent).toHaveBeenCalledTimes(1)
  expect(container.createEvent).toHaveBeenCalledWith(expect.objectContaining({
    type: 'CONNECTION_BAD', customData: { id: 'CONNECTION_KAPPTURE', message: 'Network unavailable' }
  }))
})

it('does not fail an accepted sale if writing the success event rejects', async () => {
  container.createEvent.mockRejectedValue(new Error('Database unavailable'))
  await expect(hook(config, container)).rejects.toThrow('Database unavailable')
  expect(container.payment.onSessionFail).not.toHaveBeenCalled()
})

it('pulls every product page as flat JSON and uses the returned mapping in orders', async () => {
  fetch.mockReset()
    .mockResolvedValueOnce(response({ token: 'jwt' }))
    .mockResolvedValueOnce(response({ product: [{ id: 123, productGroupId: 45, name: 'Coffee', price: 6 }], page: 1, count: 1, totalPages: 2 }))
    .mockResolvedValueOnce(response({ product: [{ id: 456, productGroupId: 78, name: 'Tea' }], page: 2, count: 1, totalPages: 2 }))
  const result = await connection.methods.getLocations.logic({ config })
  expect(result).toEqual([{ id: '123---45', name: 'Coffee' }, { id: '456---78', name: 'Tea' }])
  expect(fetch.mock.calls.map(([url]) => url)).toEqual([
    'https://api.eu-west-1.kappture.com/auth',
    'https://api.eu-west-1.kappture.com/product?count=100&page=1',
    'https://api.eu-west-1.kappture.com/product?count=100&page=2'
  ])
  expect(fetch.mock.calls[2][1]).toMatchObject({ method: 'GET', headers: { authorization: 'Bearer jwt', 'x-api-key': 'key' } })
  expect(container.rdic.get).not.toHaveBeenCalled()
  expect(container.createEvent).not.toHaveBeenCalled()

  container.customData.cart[0].productTheirId = result[0].id
  fetch.mockReset()
    .mockResolvedValueOnce(response({ token: 'jwt' }))
    .mockResolvedValueOnce(response([{ id: 3 }]))
    .mockResolvedValueOnce(response({ processCount: 1 }))
  await hook(config, container)
  const product = JSON.parse(fetch.mock.calls[2][1].body).orders[0].products[0]
  expect(product).toMatchObject({ productId: 123, productGroupId: 45 })
  expect(product.plu).toBeUndefined()
})

it('returns an empty list for an empty catalogue', async () => {
  fetch.mockReset()
    .mockResolvedValueOnce(response({ token: 'jwt' }))
    .mockResolvedValueOnce(response({ product: [], page: 1, count: 0, totalPages: 0 }))
  await expect(connection.methods.getLocations.logic({ config })).resolves.toEqual([])
  expect(fetch).toHaveBeenCalledTimes(2)
})

it('rejects a failed later page rather than returning a partial catalogue', async () => {
  fetch.mockReset()
    .mockResolvedValueOnce(response({ token: 'jwt' }))
    .mockResolvedValueOnce(response({ product: [{ id: 123, productGroupId: 45, name: 'Coffee' }], page: 1, totalPages: 2 }))
    .mockResolvedValueOnce(response('Unavailable', 503))
  await expect(connection.methods.getLocations.logic({ config })).rejects.toThrow('503')
})
