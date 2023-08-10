module.exports = async function makeRequest(apiKey, method, url, json) {
  global.rdic.logger.log({}, '[CONNECTION_PASSKIT] [makeRequest] apiKey', apiKey)
  global.rdic.logger.log({}, '[CONNECTION_PASSKIT] [makeRequest] method', method)
  global.rdic.logger.log({}, '[CONNECTION_PASSKIT] [makeRequest] url', url)
  global.rdic.logger.log({}, '[CONNECTION_PASSKIT] [makeRequest] json', json)

  try {
    const response = await fetch(url,
      {
        method,
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        json
      }
    )

    const body = await response.json()

    global.rdic.logger.log({}, '[CONNECTION_PASSKIT] [makeRequest] toReturn', body)

    return body
  } catch (e) {
    global.rdic.logger.log({}, '[CONNECTION_PASSKIT] [makeRequest] error', e)

    return undefined
  }
}
