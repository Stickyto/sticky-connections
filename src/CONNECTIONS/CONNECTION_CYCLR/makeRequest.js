module.exports = async function makeRequest(method, url, json) {
  global.rdic.logger.log({}, '[CONNECTION_CYCLR] [makeRequest]', { method, url, json })
  const response = await fetch(
    url,
    {
      method,
      body: JSON.stringify(json)
    }
  )
  if (!response.ok) {
    throw new Error(`!response.ok: [${url}]: ${await response.text()}`)
  }
  const asJson = await response.json()
  global.rdic.logger.log({}, '[CONNECTION_CYCLR] [makeRequest]', { asJson })
  return asJson
}
