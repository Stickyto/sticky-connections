const Connection = require('../Connection')

async function makeRequest(bearerToken, url, body) {
  global.rdic.logger.log({}, '[CONNECTION_RIMINI] [makeRequest] 1', { bearerToken, url, body })
  const response = await fetch(
    url,
    {
      method: 'post',
      body: JSON.stringify(body),
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json'
      }
    }
  )
  global.rdic.logger.log({}, '[CONNECTION_RIMINI] [makeRequest] 2', { responseOk: response.ok, responseStatus: response.status })
  if (!response.ok) {
    const asJson = await response.json()
    const asString = JSON.stringify(asJson, null, 2)
    throw new Error(asString)
  }
  global.rdic.logger.log({}, '[CONNECTION_RIMINI] [makeRequest] 3')
}

async function eventHookLogic(config, connectionContainer) {
  const { user, application, payment, session, createEvent } = connectionContainer
  const [cEndpoint, cBearerToken] = config

  const makeRequestBody = {
    "amount": Number((payment.total / 100).toFixed(2)),
    "customerAliasId": session.id,
    "cashierId": payment.userPaymentId,
    "referenceId": payment.userPaymentId,
    "paymentRequestId": payment.id
  }

  try {
    await makeRequest(
      cBearerToken,
      cEndpoint,
      makeRequestBody
    )
  } catch (e) {
    createEvent({
      type: 'CONNECTION_BAD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      customData: { id: 'CONNECTION_RIMINI', message: e.message }
    })
  }
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
