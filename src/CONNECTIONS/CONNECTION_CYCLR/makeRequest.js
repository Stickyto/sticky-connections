/* eslint-disable max-len */
module.exports = async function makeRequest(method, url, json) {
  global.rdic.logger.log({}, '[CONNECTION_CYCLR] [makeRequest] method', { method })
  global.rdic.logger.log({}, '[CONNECTION_CYCLR] [makeRequest] url', { url })
  global.rdic.logger.log({}, '[CONNECTION_CYCLR] [makeRequest] json/mimeType', { json })

  const response = await fetch(url,
    {
      method,
      body: JSON.stringify(json)
    }
  )

  try {
    const body = await response.json()
    global.rdic.logger.log({}, '[CONNECTION_CYCLR] [makeRequest] body', body)

    return body
  } catch (e) {
    return undefined
  }
}
