const { assert } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')

function money (value) {
  return Number(((value || 0) / 100).toFixed(2))
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
    _posId,
    connectSignature,
    encryptedKey,
    mediaNumber,
    memberId,
    orderType,
    paymentTypeId
  ] = config

  try {
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
        .filter(item => item.productTheirId)
        .flatMap(item => [{
          menuItemID: Number(item.productTheirId),
          parentID: -1,
          price: money(item.productPrice),
          quantity: item.quantity
        }, ...(item.questions || []).flatMap(question => {
          const answers = Array.isArray(question.answer) ? question.answer : [question.answer]

          return answers
            .map(answer => (question.options || []).find(option => option.name === answer))
            .filter(option => option && option.theirId)
            .map(option => ({
              menuItemID: Number(option.theirId),
              parentID: -1,
              price: money(option.delta),
              quantity: item.quantity
            }))
        })]),
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
    assert(payload.items.length > 0, 'No bag items have "Your ID" set.')

    const httpResponse = await fetch(
      `${apiHost.replace(/\/$/, '')}/pos/${encodeURIComponent(application.theirId || 'NO_APPLICATION_THEIR_ID')}/orders`,
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
    'POS ID (IGNORE)',
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
