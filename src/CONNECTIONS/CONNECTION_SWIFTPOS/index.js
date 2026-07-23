const { assert } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')

function money (value) {
  return Number(((value || 0) / 100).toFixed(2))
}

function kitchenInstructionsFor (cart) {
  return cart
    .flatMap(item => (item.questions || []).map(question => {
      const questionName = (question.question || '').trim()
      return `${item.productName}: ${questionName ? `${questionName}: ` : ''}${question.answer}`
    }))
    .join(' -- ')
}

async function eventHookLogic (config, connectionContainer) {
  const { user, application, thing, payment, customData, createEvent } = connectionContainer
  const [
    apiHost,
    posId,
    connectSignature,
    encryptedKey,
    mediaNumber,
    memberId,
    orderType,
    paymentTypeId
  ] = config

  try {
    assert(posId, 'POS ID is not configured.')
    assert(encryptedKey, 'Connect encrypted key is not configured.')
    assert(customData.cart.length > 0, 'The bag is empty.')

    const tableId = (() => {
      if (!thing) {
        return ''
      }
      if (thing.theirId) {
        return thing.theirId.toString()
      }
      const numberFromName = (thing.name || '').match(/\d+/)
      return numberFromName ? numberFromName[0] : (thing.name || '')
    })()
    const customerName = typeof payment.name === 'string' ? payment.name.trim() : ''
    const payload = {
      comments: payment.extra || '',
      contactNumber: payment.phone || '',
      items: customData.cart
        .filter(item => item.productTheirId)
        .map(item => ({
          menuItemID: Number(item.productTheirId),
          parentID: -1,
          price: money(item.productPrice),
          quantity: item.quantity
        })),
      kitchenInstructions: kitchenInstructionsFor(customData.cart),
      mediaNumber: Number(mediaNumber),
      memberID: memberId,
      orderName: [
        tableId && `Table ${tableId}`,
        customerName
      ].filter(Boolean).join(' - ') || payment.id,
      orderType,
      paymentAmount: 0,
      paymentTypeID: Number(paymentTypeId),
      payments: [
        {
          amount: money(payment.total),
          id: Number(paymentTypeId),
          tip: money(payment.tip)
        }
      ],
      receiptRequired: true,
      serviceChargeAmount: 0,
      tableID: tableId
    }
    assert(payload.items.length > 0, 'No cart items have an external SwiftPOS menu item ID.')

    const httpResponse = await fetch(
      `${apiHost.replace(/\/$/, '')}/pos/${encodeURIComponent(posId)}/orders`,
      {
        method: 'POST',
        headers: {
          'Connect-Signature': connectSignature,
          'Connect-Encrypted-Key': encryptedKey,
          'Authorization': 'Legacy',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    )
    const responseBody = await httpResponse.text()
    assert(httpResponse.ok, `SwiftPOS returned ${httpResponse.status}: ${responseBody}`)

    let response
    try {
      response = JSON.parse(responseBody)
    } catch (_) {
      throw new Error(`SwiftPOS returned invalid JSON: ${responseBody}`)
    }
    assert(typeof response.orderID === 'number', `SwiftPOS response does not contain a numeric orderID.\n\n${responseBody}`)

    createEvent({
      type: 'CONNECTION_GOOD',
      userId: user.id,
      paymentId: payment.id,
      applicationId: application ? application.id : undefined,
      thingId: thing ? thing.id : undefined,
      customData: {
        id: 'CONNECTION_SWIFTPOS',
        theirId: JSON.stringify(response, null, 2)
      }
    })
  } catch (error) {
    createEvent({
      type: 'CONNECTION_BAD',
      userId: user.id,
      paymentId: payment.id,
      applicationId: application ? application.id : undefined,
      thingId: thing ? thing.id : undefined,
      customData: {
        id: 'CONNECTION_SWIFTPOS',
        message: error.message
      }
    })
  }
}

module.exports = new Connection({
  id: 'CONNECTION_SWIFTPOS',
  type: 'CONNECTION_TYPE_POINT_OF_SALE',
  name: 'SwiftPOS',
  color: '#273D8F',
  logo: cdn => `${cdn}/connections/CONNECTION_SWIFTPOS.svg`,
  configNames: [
    'API host',
    'POS ID',
    'Connect signature',
    'Connect encrypted key',
    'Media number',
    'Member ID',
    'Order type',
    'Payment type ID'
  ],
  configDefaults: [
    'https://integration.verteda.com',
    '',
    'Swift-Levy',
    '',
    '3',
    '1',
    'EatIn',
    '3'
  ],
  eventHooks: {
    'SESSION_CART_PAY': eventHookLogic
  }
})
