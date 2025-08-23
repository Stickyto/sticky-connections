const { assert, isUuid, getNow, formatPrice } = require('@stickyto/openbox-node-utils')
const { Payment } = require('openbox-entities')
const assertIsCartValid = require('./isCartValid/isCartValid')
const connectionGo = require('./connectionGo')

module.exports = async function methodPayment (connection, { connectionContainer, body }) {
  const { user, partner, rdic, createEvent, getProducts } = connectionContainer
  global.rdic.logger.log({ user }, '[methodPayment]', { connection, body })
  const dlr = rdic.get('datalayerRelational')

  let {
    cart,
    sessionId,
    applicationId,
    thingId,
    total,
    discount,
    paymentGatewayId,
    gateway
  } = body
  if (typeof cart === 'string') {
    user.assertCan('magic')
    const magicConnections = user.connections
      .map(possibleConnection => {
        const foundConnection = require(`./CONNECTIONS/${possibleConnection.id}`)
        return foundConnection.type === 'CONNECTION_TYPE_AI' ? foundConnection : undefined
      })
      .filter(_ => _)
    assert(magicConnections.length > 0, 'Please connect an AI by going to Account > Connections. Choose AI Simulator to get started.')
    assert(magicConnections.length === 1, 'You are connected to more than one AI in Account > Connections.')

    const messageAsString = await connectionGo(
      magicConnections[0],
      'magic',
      {
        user,
        partner,
        body: {
          systemMessage: `
You are a robot that parses paper receipts strictly into JSON. Respond with JSON only. Do not include markdown, backticks, or explanations. Your response must be valid JSON that can be parsed by JSON.parse().

The JSON must always contain:
 - total: the receipt total as a number.
 - products: an array of objects. Each object has:
 - theirId: the product name exactly as printed on the receipt (string).
 - quantity: the quantity of that product (integer).

Ignore any modifiers, options, or sub-items that are not standalone purchased products.
          `,
          userMessage: cart
        },
        rdic
      }
    )

    const messageAsObject = JSON.parse(messageAsString)

    global.rdic.logger.log({ user }, '[methodPayment]', { messageAsString, messageAsObject })

    total = parseInt(parseFloat(messageAsObject.total) * 100, 10)

    const allProducts = await getProducts(rdic, user)
    cart = []
    messageAsObject.products.forEach(p => {
      const foundProduct = allProducts.find(_p => _p.theirId && _p.theirId.toUpperCase() === p.theirId.trim().toUpperCase())
      assert(foundProduct, `"${p.theirId}" is not recognised.`)
      cart.push({
        productId: foundProduct.id,
        productName: foundProduct.name,
        productPrice: foundProduct.price,
        productTheirId: foundProduct.theirId,
        quantity: p.quantity
      })
    })
  }

  assert(isUuid(sessionId) || sessionId === undefined, 'sessionId is not a UUID or undefined!')
  assert(isUuid(applicationId) || applicationId === undefined, 'applicationId is not a UUID or undefined!')
  assert(isUuid(thingId) || thingId === undefined, 'thingId is not a UUID or undefined!')
  assert(typeof total === 'number', 'total is not a number!')
  assert(typeof discount === 'number' || discount === undefined, 'discount is not a number or undefined!')
  assert(typeof paymentGatewayId === 'string' || paymentGatewayId === undefined, 'paymentGatewayId is not a string or undefined!')

  if (typeof cart === 'object') {
    assertIsCartValid(cart)
  }

  const finalCart = typeof cart === 'object' ? cart.map(_ => {
    return {
      ..._,
      productCurrency: user.currency,
      questions: []
    }
  }) : undefined
  const finalGateway = gateway || 'GATEWAY_NOOP'
  const payment = new Payment(
    {
      sessionId,
      applicationId,
      thingId,
      type: finalGateway !== 'GATEWAY_NOOP' ? 'sticky' : 'external',
      userId: user.id,
      total,
      discount,
      paymentGatewayId,
      paymentGatewayExtra: connection,
      sessionPaidAt: getNow(),
      gateway: finalGateway,
      cart: finalCart,
      newStatusDone: false
    },
    user
  )
  const asDlr = payment.toDatalayerRelational()
  await dlr.create('payments', asDlr)

  const event = await createEvent({
    type: 'SESSION_CART_PAY',
    userId: user.id,
    applicationId,
    thingId,
    sessionId,
    paymentId: payment.id,
    customData: {
      total: payment.total,
      discount: payment.discount,
      currency: payment.currency,
      gateway: payment.gateway,
      cart: finalCart,
      tip: 0
    }
  })

  return {
    asPlainText: `
${(cart || []).map(ci => (`${ci.quantity} × ${ci.productName}`)).join('\n\n')}

${formatPrice(total, user.currency)}
    `.trim(),
    payment: payment.toJsonPrivate(),
    event: event.toJsonPrivate()
  }
}
