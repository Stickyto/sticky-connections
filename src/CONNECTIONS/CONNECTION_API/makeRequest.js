/* eslint-disable max-len */
module.exports = async function makeRequest(privateKey, method, url, json) {
  // global.rdic.logger.log({}, '[CONNECTION_API] [makeRequest] privateKey', privateKey)
  // global.rdic.logger.log({}, '[CONNECTION_API] [makeRequest] method', method)
  // global.rdic.logger.log({}, '[CONNECTION_API] [makeRequest] url', url)
  // global.rdic.logger.log({}, '[CONNECTION_API] [makeRequest] json', json)

  const headers = privateKey ? {
    'Authorization': `Bearer ${privateKey}`
  } : {}

  const response = await fetch(url,
    {
      method,
      headers,
      body: JSON.stringify(json)
    }
  )

  try {
    const body = await response.json()
    global.rdic.logger.log({}, '[CONNECTION_API] [makeRequest] body', body)

    return body
  } catch (e) {
    global.rdic.logger.log({}, '[CONNECTION_API] [makeRequest] error', e.message)

    return undefined
  }
}
