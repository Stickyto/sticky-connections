const { assert } = require('@stickyto/openbox-node-utils')
const { Product } = require('openbox-entities')
const Connection = require('../Connection')

const API_HOST = 'https://api.eu-west-1.kappture.com'

function integer (value, label, max = 2147483647, min = 1) {
  assert((typeof value === 'string' && /^\d+$/.test(value)) || typeof value === 'number', `${label} must be an integer.`)
  const number = Number(value)
  assert(Number.isInteger(number) && number >= min && number <= max, `${label} must be an integer between ${min} and ${max}.`)
  return number
}

function money (value) {
  assert(Number.isSafeInteger(value) && value >= 0, 'Prices and totals must be non-negative amounts in minor currency units.')
  return value / 100
}

async function request (host, path, apiKey, { method = 'GET', token, body } = {}) {
  const headers = { 'content-type': 'application/json', 'x-api-key': apiKey }
  if (token) headers.authorization = `Bearer ${token}`
  const res = await fetch(`${host}/${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {})
  })
  const text = await res.text()
  assert(res.ok, `Kappture ${method} /${path} returned ${res.status}: ${text}`)
  try {
    return JSON.parse(text)
  } catch (_) {
    throw new Error(`Kappture ${method} /${path} returned invalid JSON.`)
  }
}

async function eventHookLogic (config, connectionContainer) {
  const { rdic, payment, user, application, thing, createEvent, customData } = connectionContainer
  const [apiKey, apiSecret, configTerminalId, configPriceBandId, configSessionId, configHostApi = API_HOST] = config

  if (!application) {
    return
  }
  if (customData.cart.length === 0) {
    return
  }

  const eventData = {
    userId: user.id,
    paymentId: payment.id,
    applicationId: application.id,
    thingId: thing ? thing.id : undefined
  }

  let reference
  try {
    assert(apiKey && apiSecret, 'Kappture API key and API secret are required.')
    const host = (configHostApi || API_HOST).replace(/\/+$/, '')
    const terminalId = integer(configTerminalId, 'Terminal ID')
    const priceBandId = integer(configPriceBandId, 'Price band ID', 32767)
    const sessionId = integer(configSessionId, 'Kappture session ID')
    const tenderId = integer(application.theirId, `External system ID (Kappture tender ID) for flow '${application.name}'`)

    // Keep the first nine UUID digits to fit Kappture's int32 reference.
    reference = Number(payment.id.replace(/\D/g, '').slice(0, 9))

    const productIds = customData.cart.map(item => item.productId)
    const cartProducts = (await rdic.get('datalayerRelational').read('products', { id: productIds, user_id: user.id }))
      .map(row => new Product().fromDatalayerRelational(row))
    const products = []
    for (const item of customData.cart) {
      const plu = integer(item.productTheirId, `Kappture PLU for '${item.productName}'`)
      const quantity = integer(item.quantity, `Quantity for '${item.productName}'`, 32767)
      const price = money(item.productPrice)
      const product = cartProducts.find(product => product.id === item.productId)
      assert(product, `Product '${item.productName}' could not be found to determine its VAT rate.`)
      const vatTags = product.tags.toArray().filter(tag => tag.startsWith('vat--'))
      assert(vatTags.length <= 1, `Product '${item.productName}' has conflicting VAT tags.`)
      const vatTag = vatTags[0]
      const taxRate = !vatTag || vatTag === 'vat--no' ? 0 : vatTag === 'vat--125' ? 12.5 : Number(vatTag.slice(5))
      integer(taxRate, `Tax rate for '${item.productName}'`, 100, 0)
      products.push({
        plu,
        productName: item.productName,
        productId: 0,
        productGroupId: 0,
        quantity,
        price,
        priceBandId,
        taxRate,
        taxValue: (item.productPrice - Math.round(item.productPrice / (1 + taxRate / 100))) / 100
      })
    }

    const order = {
      sessionId,
      priceBandId,
      reference,
      openDateTime: new Date(payment.createdAt * 1000).toISOString(),
      terminalId,
      products,
      tenders: [{ tenderId, value: money(payment.total) }]
    }
    if (thing && thing.theirId) order.tableNumber = integer(thing.theirId, 'Table number', 32767, 0)

    const auth = await request(host, 'auth', apiKey, {
      method: 'POST',
      body: { api_key: apiKey, api_secret: apiSecret }
    })
    assert(auth && typeof auth.token === 'string' && auth.token.trim(), 'Kappture authentication returned no token.')
    const tenders = await request(host, 'tender', apiKey, { token: auth.token })
    assert(Array.isArray(tenders) && tenders.some(tender => tender.id === tenderId), `Kappture tender ${tenderId} was not found among enabled tenders.`)
    const result = await request(host, 'transaction', apiKey, {
      method: 'PUT',
      token: auth.token,
      body: { orders: [order] }
    })
    assert(result && result.processCount === 1, `Kappture did not process the order: ${JSON.stringify(result)}`)
  } catch (error) {
    await createEvent({
      ...eventData,
      type: 'CONNECTION_BAD',
      customData: { id: 'CONNECTION_KAPPTURE', message: error.message }
    })
    return
  }

  await createEvent({
    ...eventData,
    type: 'CONNECTION_GOOD',
    customData: { id: 'CONNECTION_KAPPTURE', theirId: String(reference) }
  })
}

module.exports = new Connection({
  id: 'CONNECTION_KAPPTURE',
  type: 'CONNECTION_TYPE_POINT_OF_SALE',
  name: 'Kappture',
  color: '#e72278',
  logo: cdn => `${cdn}/connections/CONNECTION_KAPPTURE.svg`,
  configNames: ['API key', 'API secret', 'Terminal number', 'Price band number', 'Session number', 'API host'],
  configDefaults: ['', '', '', '', '', API_HOST],
  eventHooks: {
    'SESSION_CART_PAY': eventHookLogic
  }
})
