const { assert } = require('@stickyto/openbox-node-utils')

const Connection = require('../Connection')

function money (value) {
  return Number(((value || 0) / 100).toFixed(2))
}

async function getToken ({ configApiKey, configApiSecret }) {
  const { token } = await fetch(
    `${configHostApi}/auth`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': configApiKey,
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        api_key: configApiKey,
        api_secret: configApiSecret
      })
    }
  )
  return token
}

async function eventHookLogic (config, connectionContainer) {
  const { payment, user, application, thing, createEvent, customData } = connectionContainer
  const [configApiKey, configApiSecret, configTerminalId, configPriceBandId] = config

  if (!application) {
    return
  }
  if (customData.cart.length === 0) {
    return
  }

  try {
    assert(application.theirId, `You must set the 'External system ID' field for flow '${application.name}' as your tender ID.`)

    const token = await getToken({
      configApiKey,
      configApiSecret
    })
    console.log('--- FINAL TOKEN RESPONSE', { token })

    const res = await fetch(
      `${configHostApi}/transaction`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': configApiKey,
          'authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          'orders': [
            {
              'sessionId': 1,
              'priceBandId': 2,
              'reference': 555101,
              'tableNumber': 0,
              'openDateTime': '2025-01-20T12:34:56Z',
              'terminalId': parseInt(configTerminalId, 10),
              'products': [
                {
                  'productId': 123,
                  'productGroupId': 45,
                  'quantity': 2,
                  'taxValue': 0.2,
                  'taxRate': 20,
                  'price': 5,
                  'priceBandId': parseInt(configPriceBandId, 10)
                }
              ],
              'tenders': [
                {
                  'tenderId': application.theirId,
                  'value': money(payment.total)
                }
              ]
            }
          ]
        })
      }
    )
    console.log('[placeOrder] status:', res.status)
    const json = await res.json()
    console.log('[placeOrder] response:', json)
    assert(res.status === 200, JSON.stringify(json, null, 2))

    createEvent({
      type: 'CONNECTION_GOOD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      thingId: thing ? thing.id : undefined,
      customData: { id: 'CONNECTION_KAPPTURE', theirId: `${checkNumber} / ${checkRef}` }
    })
  } catch (e) {
    payment.onSessionFail(rdic, user, { whichConnection: 'CONNECTION_KAPPTURE' }, { customSubject: '⚠️ Your {name} order was not successful', customMessage: '<p>We are sorry but your {name} order was not successful.</p>' })
    createEvent({
      type: 'CONNECTION_BAD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      thingId: thing ? thing.id : undefined,
      customData: { id: 'CONNECTION_KAPPTURE', message: e.message }
    })
  }
}

module.exports = new Connection({
  id: 'CONNECTION_KAPPTURE',
  type: 'CONNECTION_TYPE_POINT_OF_SALE',
  name: 'Kappture',
  color: '#e72278',
  logo: cdn => `${cdn}/connections/CONNECTION_KAPPTURE.svg`,
  configNames: ['API key', 'API secret', 'Tender number', 'Price band number'],
  configDefaults: ['', '', ''],
  eventHooks: {
    'SESSION_CART_PAY': eventHookLogic
  }
})
