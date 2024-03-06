/* eslint-disable max-len */
module.exports = async function makeRequest(method, url, json) {
  global.rdic.logger.log({}, '[CONNECTION_WOOCOMMERCE] [makeRequest] 1', { method, url, json })

  const headers = {
    'Content-Type': 'application/json'
  }

  const response = await fetch(
    url,
    {
      method,
      headers,
      body: json ? JSON.stringify(json) : undefined
    }
  )
  if (!response.ok) {
    throw new Error(`!response.ok: [${url}]: ${await response.text()}`)
  }

  let body

  try {
    body = await response.json()
  } catch (e) {
    global.rdic.logger.log({}, '[CONNECTION_WOOCOMMERCE] [makeRequest] 2')
  }
  global.rdic.logger.log({}, '[CONNECTION_WOOCOMMERCE] [makeRequest] 3', body)

  return body
}
