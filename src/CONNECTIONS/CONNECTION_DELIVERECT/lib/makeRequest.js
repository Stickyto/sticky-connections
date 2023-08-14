/* eslint-disable max-len */
const { assert } = require('@stickyto/openbox-node-utils')

const MIME_DECODERS = new Map([
  // when they don't return a content-type header, it could be anything (usually a body-less HTTP 201)
  ['unknown', _ => {
    try {
      return _
    } catch (e) {
      return { ourMessage: 'All good in the hood!' }
    }
  }],
  ['application/json', _ => _],
  ['text/html', () => ({ ourMessage: 'Deliverect returned HTML. This is very bad.' })]
])

module.exports = async function makeRequest(token, method, url, json) {
  global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [makeRequest] token', token)
  global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [makeRequest] method', method)
  global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [makeRequest] url', url)
  global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [makeRequest] json', json)

  const headers = token ? {
    'Authorization': `Bearer ${token}`
  } : {}

  const response = await fetch(url,
    {
      method,
      headers,
      body: JSON.stringify(json),
      throwHttpErrors: false
    }
  )

  let body
  const contentType = response.headers.get('content-type') || 'unknown'

  try {
    body = await response.json()
  } catch (e) {
    body = MIME_DECODERS.get('unknown')(e.message)
  }

  const finalToReturn = MIME_DECODERS.get(contentType)(body)

  assert([201, 200].includes(response.status), JSON.stringify(finalToReturn, null, 2))

  global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [makeRequest] 1 body', body)
  global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [makeRequest] 2 finalToReturn', finalToReturn)

  return finalToReturn
}
