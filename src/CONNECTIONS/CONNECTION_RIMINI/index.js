const Connection = require('../Connection')

async function makeRequest (bearerToken, url, json) {
  global.rdic.logger.log({}, '[CONNECTION_RIMINI] [makeRequest]', { bearerToken, url, json })
  const response = await fetch(
    url,
    {
      json,
      headers: {
        'Authorization': `Bearer ${bearerToken}`
      }
    }
  )
  try {
    const body = await response.json()
    global.rdic.logger.log({}, '[CONNECTION_RIMINI] [makeRequest] body', body)
    return body
  } catch (e) {
    return undefined
  }
}

async function eventHookLogic (config, connectionContainer) {
  const { user, payment, session } = connectionContainer
  const [cEndpoint, cBearerToken] = config

  const makeRequestBody = {
    "amount": (payment.total / 100).toFixed(2),
    "customerAliasId": session.id,
    "cashierId": payment.userPaymentId,
    "referenceId": payment.userPaymentId,
    "paymentRequestId": payment.id
  }

  global.rdic.logger.log({ user }, '[CONNECTION_RIMINI]', { makeRequestBody })

  await makeRequest(
    cBearerToken,
    cEndpoint,
    makeRequestBody
  )
}

module.exports = new Connection({
  id: 'CONNECTION_RIMINI',
  name: 'Rimini',
  type: 'CONNECTION_TYPE_CHP',
  color: '#2A4491',
  logo: cdn => `${cdn}/connections/CONNECTION_RIMINI.svg`,
  configNames: ['Endpoint', 'Bearer token'],
  configDefaults: ['', ''],
  eventHooks: {
    'SESSION_CART_PAY': eventHookLogic
  }
})
