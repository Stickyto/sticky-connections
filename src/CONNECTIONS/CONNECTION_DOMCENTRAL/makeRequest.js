module.exports = async function makeRequest(method, url, json, headers) {
  global.rdic.logger.log({}, '[CONNECTION_DOMCENTRAL] [makeRequest] method', method)
  global.rdic.logger.log({}, '[CONNECTION_DOMCENTRAL] [makeRequest] url', url)
  global.rdic.logger.log({}, '[CONNECTION_DOMCENTRAL] [makeRequest] json', json)
  global.rdic.logger.log({}, '[CONNECTION_DOMCENTRAL] [makeRequest] headers', headers)

  const response = await fetch(url, { method, headers, body: JSON.stringify(json) })

  try {
    const body = await response.json()
    global.rdic.logger.log({}, '[CONNECTION_DOMCENTRAL] [makeRequest] body', body)

    return body
  } catch (e) {
    global.rdic.logger.log({}, '[CONNECTION_DOMCENTRAL] [makeRequest] error', e.message)

    return undefined
  }
}
