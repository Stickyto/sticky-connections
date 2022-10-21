/* eslint-disable max-len */
const got = require('got')

const MIME_TYPES = new Map([
  ['json', _ => JSON.parse(_)]
])

module.exports = async function makeRequest (apiToken, method, url, json, mimeType) {
  global.rdic.logger.log({}, '[CONNECTION_MAILCHIMP] [makeRequest] apiToken', { apiToken })
  global.rdic.logger.log({}, '[CONNECTION_MAILCHIMP] [makeRequest] method', { method })
  global.rdic.logger.log({}, '[CONNECTION_MAILCHIMP] [makeRequest] url', { url })
  global.rdic.logger.log({}, '[CONNECTION_MAILCHIMP] [makeRequest] json/mimeType', { json, mimeType })

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

  global.rdic.logger.log({}, '[CONNECTION_MAILCHIMP] [makeRequest] bodyAsString', bodyAsString)
  global.rdic.logger.log({}, '[CONNECTION_MAILCHIMP] [makeRequest] typeof bodyAsString', typeof bodyAsString)
  global.rdic.logger.log({}, '[CONNECTION_MAILCHIMP] [makeRequest] bodyAsString.length', bodyAsString.length)

  const toReturn = typeof bodyAsString === 'string' && bodyAsString.length > 0 ? MIME_TYPES.get(mimeType)(bodyAsString) : undefined
  global.rdic.logger.log({}, '[CONNECTION_MAILCHIMP] toReturn', toReturn)

  return toReturn
}
