module.exports = async function makeRequest(apiToken, method, url, json) {
  global.rdic.logger.log({}, '[CONNECTION_MAILCHIMP] [makeRequest] apiToken', { apiToken })
  global.rdic.logger.log({}, '[CONNECTION_MAILCHIMP] [makeRequest] method', { method })
  global.rdic.logger.log({}, '[CONNECTION_MAILCHIMP] [makeRequest] url', { url })
  global.rdic.logger.log({}, '[CONNECTION_MAILCHIMP] [makeRequest] json', { json })

  const headers = apiToken ? {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json'
  } : { 'Content-Type': 'application/json' }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(json)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const body = await response.json()
    global.rdic.logger.log({}, '[CONNECTION_MAILCHIMP] [makeRequest] body', body)

    return body

  } catch (e) {
    global.rdic.logger.log({}, '[CONNECTION_MAILCHIMP] [makeRequest] error', e)
    return undefined
  }
}
