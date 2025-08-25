const Connection = require('../Connection')

function formatUnixToIso (unixtime) {
  return new Date(unixtime * 1000).toISOString();
}

async function makeRequest (method, url, json, apiKey) {
  global.rdic.logger.log({}, '[CONNECTION_TRUSTIST_INGEST] [makeRequest] 1', { method, url, json, apiKey })

  const headers = {
    'content-type': 'application/json',
    'x-api-key': apiKey
  }

  const response = await fetch(
    url,
    {
      method,
      headers,
      body: json ? JSON.stringify(json) : undefined
    }
  )
  if (!response.ok) {
    throw new Error(`!response.ok: [${url}]: ${await response.text()}`)
  }

  let body
  try {
    body = await response.json()
  } catch (e) {
    global.rdic.logger.log({}, '[CONNECTION_TRUSTIST_INGEST] [makeRequest] 2')
  }
  global.rdic.logger.log({}, '[CONNECTION_TRUSTIST_INGEST] [makeRequest] 3', body)
  return body
}


async function eventHookLogic (wasSuccessful, config, connectionContainer) {
  const { user, application, thing, payment, createEvent } = connectionContainer
  const [configUrl, configApiKey, configMerchantId] = config

  if (config.some(_ => _.length === 0)) {
    return
  }

  const eventPayload = {
    userId: user.id,
    applicationId: application ? application.id : undefined,
    thingId: thing ? thing.id : undefined,
    paymentId: payment.id,
  }

  try {
    const reqUrl = `https://${configUrl}`
    const finalStatus = wasSuccessful ? 'completed' : 'failed'
    const reqBody = {
      'paymentId': payment.id,
      'merchantId': configMerchantId,
      'amount': (payment.total / 100).toFixed(2),
      'fee': (
        Math.ceil(
          (
            payment.total *
            (payment.stickypayMerchantPercentage / 10000)
          )
          +
          payment.stickypayPerTx
        )
        / 100
      )
        .toFixed(2),
      'status': finalStatus,
      'createdAt': formatUnixToIso(payment.createdAt),
      'completedAt': wasSuccessful ? formatUnixToIso(payment.sessionPaidAt) : formatUnixToIso(payment.sessionFailedAt),
      'currency': payment.currency,
      'paymentType': payment.gateway === 'GATEWAY_RYFT' ? 'card' : 'openbanking',
      'reason': payment.userPaymentId
    }
    global.rdic.logger.log({}, '[CONNECTION_TRUSTIST_INGEST]', { wasSuccessful, configUrl, reqUrl, reqBody })

    await makeRequest(
      'post',
      reqUrl,
      reqBody,
      configApiKey
    )
    createEvent({
      ...eventPayload,
      type: 'CONNECTION_GOOD',
      customData: { id: 'CONNECTION_TRUSTIST_INGEST', theirId: `Payment ID ${payment.id} / ${payment.userPaymentId} status set to "${finalStatus}".` }
    })
  } catch (e) {
    createEvent({
      ...eventPayload,
      type: 'CONNECTION_BAD',
      customData: { id: 'CONNECTION_TRUSTIST_INGEST', theirId: payment.userPaymentId, message: e.message }
    })
  }
}

module.exports = new Connection({
  id: 'CONNECTION_TRUSTIST_INGEST',
  type: 'CONNECTION_TYPE_ERP',
  name: 'Trustist Ingest',
  color: '#003466',
  logo: cdn => `${cdn}/connections/CONNECTION_TRUSTIST_INGEST.svg`,
  configNames: ['URL', 'API key', 'Merchant ID'],
  configDefaults: ['trustist-uk-apim.azure-api.net/instantdebit-Ingest', '', ''],
  eventHooks: {
    'SESSION_CART_PAY': (...args) => eventHookLogic(true, ...args),
    'SESSION_CART_PAY_FAIL': (...args) => eventHookLogic(false, ...args),
  }
})
