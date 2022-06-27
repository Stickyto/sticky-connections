/* eslint-disable max-len */
const got = require('got')

module.exports = async function makeRequest (privateKey, method, url, json) {
  global.rdic.logger.log({}, '[CONNECTION_API] [makeRequest] privateKey', privateKey)
  global.rdic.logger.log({}, '[CONNECTION_API] [makeRequest] method', method)
  global.rdic.logger.log({}, '[CONNECTION_API] [makeRequest] url', url)
  global.rdic.logger.log({}, '[CONNECTION_API] [makeRequest] json', json)

  const headers = privateKey ? {
    'Authorization': `Bearer ${privateKey}`
  } : {}
  const { body: bodyAsString } = await got[method](
    url,
    {
      headers,
      json
    }
  )

  global.rdic.logger.log({}, '[CONNECTION_API] [makeRequest] bodyAsString', bodyAsString)
  global.rdic.logger.log({}, '[CONNECTION_API] [makeRequest] typeof bodyAsString', typeof bodyAsString)
  global.rdic.logger.log({}, '[CONNECTION_API] [makeRequest] bodyAsString.length', bodyAsString.length)

  const toReturn = typeof bodyAsString === 'string' && bodyAsString.length > 0 ? JSON.parse(bodyAsString) : undefined
  global.rdic.logger.log({}, '[CONNECTION_API] toReturn', toReturn)

  return toReturn
}
