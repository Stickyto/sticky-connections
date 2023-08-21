module.exports = async function makeRequest(method, url, json, headers) {
  global.rdic.logger.log({}, '[CONNECTION_DOMCENTRAL] [makeRequest] 1', { method, url, json, headers })

  const response = await fetch(url, { method, headers, body: JSON.stringify(json) })

  const asJson = await response.json()
  global.rdic.logger.log({}, '[CONNECTION_DOMCENTRAL] [makeRequest] 2', { asJson })
  return asJson
}
