/* eslint-disable max-len */
const got = require('got')
const { assert } = require('openbox-node-utils')

const MIME_DECODERS = new Map([
  // when they don't return a content-type header, it could be anything (usually a body-less HTTP 201)
  ['unknown', _ => {
    try {
      return JSON.parse(_)
    } catch (e) {
      return { ourMessage: 'All good in the hood!' }
    }
  }],
  ['application/json', _ => JSON.parse(_)],
  ['text/html', () => ({ ourMessage: 'Deliverect returned HTML. This is very bad.' })]
])

module.exports = async function makeRequest (token, method, url, json) {
  global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [makeRequest] token', token)
  global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [makeRequest] method', method)
  global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [makeRequest] url', url)
  global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [makeRequest] json', json)

  const headers = token ? {
    'Authorization': `Bearer ${token}`
  } : {}
  const { body: bodyAsString, ...response } = await got[method](
    url,
    {
      headers,
      json,
      throwHttpErrors: false
    }
  )

  const finalToReturn = MIME_DECODERS.get(((response.headers || {})['content-type']) || 'unknown')(bodyAsString)

  assert([201, 200].includes(response.statusCode), JSON.stringify(finalToReturn, null, 2))

  global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [makeRequest] bodyAsString', bodyAsString)
  global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [makeRequest] bodyAsString', bodyAsString)
  global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [makeRequest] finalToReturn', finalToReturn)
  global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [makeRequest] bodyAsString.length', bodyAsString.length)

  return finalToReturn
}
