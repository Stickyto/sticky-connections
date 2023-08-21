module.exports = async function makeRequest(apiKey, method, url, json) {
  global.rdic.logger.log({}, '[CONNECTION_PASSKIT] [makeRequest] 1', { apiKey, method, url, json })

  const response = await fetch(
    url,
    {
      method,
      headers: {
        'authorization': `Bearer ${apiKey}`
      },
      body: json ? JSON.stringify(json) : undefined
    }
  )
  const asJson = await response.json()

  if (!response.ok) {
    throw new Error(asJson.error)
  }

  global.rdic.logger.log({}, '[CONNECTION_PASSKIT] [makeRequest] 2', { asJson })
  return asJson
}
