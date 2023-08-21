module.exports = async function makeRequest(config, url) {
  const [apiKey, email] = config

  const response = await fetch(
    `https://business.untappd.com/api/${url}`,
    {
      headers: {
        'authorization': 'Basic ' + Buffer.from(`${email}:${apiKey}`).toString('base64')
      }
    })
  if (!response.ok) {
    throw new Error(`!response.ok: [${url}]: ${await response.text()}`)
  }
  const asJson = await response.json()
  return asJson
}
