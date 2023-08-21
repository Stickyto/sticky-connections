module.exports = async function makeRequest(config, url) {
  const [apiKey] = config

  const response = await fetch(
    `https://api.loyverse.com${url}`,
    {
      headers: {
        'authorization': `Bearer ${apiKey}`
      }
    }
  )
  if (!response.ok) {
    throw new Error(`!response.ok: [${url}]: ${await response.text()}`)
  }

  const asJson = await response.json()
  global.rdic.logger.log({}, '[CONNECTION_LOYALVERSE] [makeRequest]', { asJson })
  return asJson
}
