/* eslint-disable max-len */
const got = require('got')

module.exports = async function makeRequest (method, url, json) {
  global.rdic.logger.log({}, '[CONNECTION_CYCLR] [makeRequest] method', { method })
  global.rdic.logger.log({}, '[CONNECTION_CYCLR] [makeRequest] url', { url })
  global.rdic.logger.log({}, '[CONNECTION_CYCLR] [makeRequest] json/mimeType', { json })

  const { body: bodyAsString } = await got[method](
    url,
    {
      json
    }
  )

  global.rdic.logger.log({}, '[CONNECTION_CYCLR] [makeRequest] bodyAsString', bodyAsString)
  global.rdic.logger.log({}, '[CONNECTION_CYCLR] [makeRequest] typeof bodyAsString', typeof bodyAsString)
  global.rdic.logger.log({}, '[CONNECTION_CYCLR] [makeRequest] bodyAsString.length', bodyAsString.length)

  const toReturn = typeof bodyAsString === 'string' && bodyAsString.length > 0 ? JSON.parse(bodyAsString) : undefined
  global.rdic.logger.log({}, '[CONNECTION_CYCLR] toReturn', toReturn)

  return toReturn
}
