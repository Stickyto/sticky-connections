module.exports = async function makeRequest(config, url) {
  const [apiKey] = config

  try {
    const response = await fetch(
      `https://api.loyverse.com${url}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    )

    const body = await response.json()

    global.rdic.logger.log({}, '[CONNECTION_LOYALVERSE] [makeRequest] body', body)

    return body
  } catch (e) {
    global.rdic.logger.log({}, '[CONNECTION_LOYALVERSE] [makeRequest] error', e)

    return undefined
  }
}