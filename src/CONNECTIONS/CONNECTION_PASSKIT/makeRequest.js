/* eslint-disable max-len */
const got = require('got')

module.exports = async function makeRequest (apiKey, method, url, json) {
  global.rdic.logger.log({}, '[CONNECTION_PASSKIT] [makeRequest] apiKey', apiKey)
  global.rdic.logger.log({}, '[CONNECTION_PASSKIT] [makeRequest] method', method)
  global.rdic.logger.log({}, '[CONNECTION_PASSKIT] [makeRequest] url', url)
  global.rdic.logger.log({}, '[CONNECTION_PASSKIT] [makeRequest] json', json)

  const { body: bodyAsString } = await got[method](
    url,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      json
    }
  )

  global.rdic.logger.log({}, '[CONNECTION_PASSKIT] [makeRequest] bodyAsString', bodyAsString)
  global.rdic.logger.log({}, '[CONNECTION_PASSKIT] [makeRequest] typeof bodyAsString', typeof bodyAsString)
  global.rdic.logger.log({}, '[CONNECTION_PASSKIT] [makeRequest] bodyAsString.length', bodyAsString.length)

  const toReturn = typeof bodyAsString === 'string' && bodyAsString.length > 0 ? JSON.parse(bodyAsString) : undefined
  global.rdic.logger.log({}, '[CONNECTION_PASSKIT] toReturn', toReturn)

  return toReturn
}
