/* eslint-disable max-len */
const got = require('got')

const MIME_TYPES = new Map([
  ['text', _ => _],
  ['json', _ => JSON.parse(_)]
])

module.exports = async function makeRequest (apiToken, method, url, json, mimeType) {
  global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] apiToken', { apiToken })
  global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] method', { method })
  global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] url', { url })
  global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] json/mimeType', { json, mimeType })

  const headers = apiToken ? {
    'Authorization': `Bearer ${apiToken}`
  } : {}
  const { body: bodyAsString } = await got[method](
    url,
    {
      headers,
      json
    }
  )

  global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] typeof bodyAsString', typeof bodyAsString)
  global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] bodyAsString.length', bodyAsString.length)

  const toReturn = typeof bodyAsString === 'string' && bodyAsString.length > 0 ? MIME_TYPES.get(mimeType)(bodyAsString) : undefined
  global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] toReturn', toReturn)

  return toReturn
}
