/* eslint-disable max-len */
module.exports = async function makeRequest(apiToken, method, url, json) {
  global.rdic.logger.log({}, '[CONNECTION_DVLA] [makeRequest] 1', { apiToken, method, url, json })

  const headers = apiToken ? {
    'x-api-key': apiToken
  } : {}

  const response = await fetch(
    url,
    {
      method,
      headers,
      body: json ? JSON.stringify(json) : undefined
    }
  )
  if (!response.ok) {
    const asJson = await response.json()
    throw new Error(asJson.message || asJson.errors[0].detail)
  }

  let body
  try {
    body = await response.json()
  } catch (e) {
    global.rdic.logger.log({}, '[CONNECTION_DVLA] [makeRequest] 2')
  }
  global.rdic.logger.log({}, '[CONNECTION_DVLA] [makeRequest] 3 body', body)

  return body
}
