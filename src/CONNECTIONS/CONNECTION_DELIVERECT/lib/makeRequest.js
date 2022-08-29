/* eslint-disable max-len */
const got = require('got')

const MIME_DECODERS = new Map([
  ['application/json', _ => JSON.parse(_)],
  ['text/html', _ => _]
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
      json
    }
  )

  global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [makeRequest] bodyAsString', bodyAsString)
  global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [makeRequest] typeof bodyAsString', typeof bodyAsString)
  global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [makeRequest] bodyAsString.length', bodyAsString.length)

  return MIME_DECODERS.get(((response.headers || {})['content-type']) || 'text/html')(bodyAsString)
}
