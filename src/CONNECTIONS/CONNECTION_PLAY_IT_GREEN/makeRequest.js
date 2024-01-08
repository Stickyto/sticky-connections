/* eslint-disable max-len */
module.exports = async function makeRequest(apiToken, method, url, json, mimeType) {
  global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] 1', { apiToken, method, url })
  global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] 2 json/mimeType', { json, mimeType })

  const headers = apiToken ? {
    'Authorization': `Bearer ${apiToken}`
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
    throw new Error(`!response.ok: [${url}]: ${await response.text()}`)
  }

  let body

  try {
    body = await response.json()
  } catch (e) {
    global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] 3')
  }

  if (mimeType === 'text') {
    body = JSON.stringify(body, null, 0)
    global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] 4 typeof body', typeof body)
    global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] 5 body.length', body.length)
  }
  global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] 6 body', body)

  return body
}
