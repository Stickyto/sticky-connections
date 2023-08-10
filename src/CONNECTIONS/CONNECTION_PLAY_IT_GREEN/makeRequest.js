/* eslint-disable max-len */
module.exports = async function makeRequest(apiToken, method, url, json, mimeType) {
  global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] apiToken', { apiToken })
  global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] method', { method })
  global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] url', { url })
  global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] json/mimeType', { json, mimeType })

  const headers = apiToken ? {
    'Authorization': `Bearer ${apiToken}`
  } : {}

  const response = await fetch(url,
    {
      method,
      headers,
      json
    }
  )

  let body

  try {
    body = await response.json()
  } catch (e) {
    global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] error', e)

    return undefined
  }

  if (mimeType === 'text') {
    body = JSON.stringify(body, null, 0)

    global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] typeof bodyAsString', typeof body)
    global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] bodyAsString.length', body.length)
  }

  global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] body', body)

  return body
}
