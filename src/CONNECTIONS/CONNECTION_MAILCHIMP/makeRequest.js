module.exports = async function makeRequest(apiToken, method, url, json) {
  global.rdic.logger.log({}, '[CONNECTION_MAILCHIMP] [makeRequest] apiToken', { apiToken })
  global.rdic.logger.log({}, '[CONNECTION_MAILCHIMP] [makeRequest] method', { method })
  global.rdic.logger.log({}, '[CONNECTION_MAILCHIMP] [makeRequest] url', { url })
  global.rdic.logger.log({}, '[CONNECTION_MAILCHIMP] [makeRequest] json', { json })

  const headers = apiToken ? {
    'authorization': `Bearer ${apiToken}`,
    'content-type': 'application/json'
  } : { 'content-type': 'application/json' }

  const response = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(json)
  })

  if (!response.ok) {
    throw new Error(`!response.ok: [${url}]: ${await response.text()}`)
  }

  const asJson = await response.json()
  global.rdic.logger.log({}, '[CONNECTION_MAILCHIMP] [makeRequest]', { asJson })
  return asJson
}
