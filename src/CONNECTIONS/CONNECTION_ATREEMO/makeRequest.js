/* eslint-disable max-len */
const got = require('got')

function getFormHttpBody (params) {
  return Object.keys(params)
    .filter(key => typeof params[key] === 'string' || typeof params[key] === 'number')
    .map(key => {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
    }).join('&')
}

const CONTENT_TYPES = new Map([
  [
    'application/json',
    _ => JSON.stringify(_)
  ],
  [
    'application/x-www-form-urlencoded',
    _ => getFormHttpBody(_)
  ]
])

module.exports = async function makeRequest (config, method, url, json, contentType = 'application/json', bearerToken) {
  const [configEndpoint] = config

  const headers = bearerToken ?
    {
      'authorization': `Bearer ${bearerToken}`,
      'content-type': contentType
    }
    :
    {}
  const body = json ? CONTENT_TYPES.get(contentType)(json) : undefined

  global.rdic.logger.log({}, '[CONNECTION_ATREEMO] [makeRequest] config', config)
  global.rdic.logger.log({}, '[CONNECTION_ATREEMO] [makeRequest] method', method)
  global.rdic.logger.log({}, '[CONNECTION_ATREEMO] [makeRequest] url', url)
  global.rdic.logger.log({}, '[CONNECTION_ATREEMO] [makeRequest] json', json)
  global.rdic.logger.log({}, '[CONNECTION_ATREEMO] [makeRequest] contentType', contentType)
  global.rdic.logger.log({}, '[CONNECTION_ATREEMO] [makeRequest] bearerToken', bearerToken)
  global.rdic.logger.log({}, '[CONNECTION_ATREEMO] [makeRequest] headers', headers)
  global.rdic.logger.log({}, '[CONNECTION_ATREEMO] [makeRequest] body', body)

  const { body: bodyAsString } = await got[method](
    `${configEndpoint}/${url}`,
    {
      headers,
      body
    }
  )

  global.rdic.logger.log({}, '[CONNECTION_ATREEMO] [makeRequest] bodyAsString', bodyAsString)
  global.rdic.logger.log({}, '[CONNECTION_ATREEMO] [makeRequest] typeof bodyAsString', typeof bodyAsString)
  global.rdic.logger.log({}, '[CONNECTION_ATREEMO] [makeRequest] bodyAsString.length', bodyAsString.length)

  const toReturn = typeof bodyAsString === 'string' && bodyAsString.length > 0 ? JSON.parse(bodyAsString) : undefined
  global.rdic.logger.log({}, '[CONNECTION_ATREEMO] toReturn', toReturn)

  return toReturn
}
