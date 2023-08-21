module.exports = async function makeRequest(privateKey, method, url, json) {
  const headers = privateKey ?
    {
      'content-type': 'application/json',
      'authorization': `Bearer ${privateKey}`
    } :
    {
      'content-type': 'application/json'
    }

  const response = await fetch(url,
    {
      method,
      headers,
      body: JSON.stringify(json)
    }
  )
  if (!response.ok) {
    throw new Error(`!response.ok: [${url}]: ${await response.text()}`)
  }

  const asJson = await response.json()
  global.rdic.logger.log({}, '[CONNECTION_API] [makeRequest]', { asJson })
  return asJson
}
