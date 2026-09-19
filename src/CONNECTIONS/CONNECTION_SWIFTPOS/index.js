const { assert } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')

function money (value) {
  return Number(((value || 0) / 100).toFixed(2))
}

function descriptionFor (item) {
  const answers = (item.questions || []).map(question => {
    const questionName = (question.question || '').trim()
    return `${questionName ? `${questionName}: ` : ''}${question.answer}`
  })
  return `${item.quantity} × ${item.productName}${answers.length ? ` (${answers.join(', ')})` : ''}`
}

async function eventHookLogic (config, connectionContainer) {
  const { user, application, thing, payment, customData, createEvent } = connectionContainer

  if (!application) {
    return
  }
  if (customData.cart.length === 0) {
    return
  }

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
        .map(item => ({
          menuItemID: 10,
          description: descriptionFor(item),
          parentID: -1,
          price: money(item.productPrice),
          quantity: item.quantity
        })),
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
    assert(payload.items.length > 0, 'No bag items to send to SwiftPOS.')
    console.log('\n\n\n========== SWIFTPOS PAYLOAD ==========\n', JSON.stringify(payload, null, 2), '\n========== END SWIFTPOS PAYLOAD ==========\n\n\n')

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
    console.log('\n\n\n========== SWIFTPOS RESPONSE BODY ==========\n', responseBody, '\n========== END SWIFTPOS RESPONSE BODY ==========\n\n\n')
    assert(httpResponse.ok, `SwiftPOS returned ${httpResponse.status}: ${responseBody}`)

    let response
    try {
      response = JSON.parse(responseBody)
    } catch (_) {
      throw new Error(`SwiftPOS returned invalid JSON: ${responseBody}`)
    }
    assert(response.orderSuccessful === true, `SwiftPOS order failed: ${response.message || responseBody}`)
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
