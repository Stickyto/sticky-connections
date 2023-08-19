/* eslint-disable max-len */

function getFormHttpBody(params) {
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

module.exports = async function makeRequest(config, method, url, json, contentType = 'application/json', bearerToken) {
  const [configEndpoint] = config

  const headers = bearerToken ?
    {
      'authorization': `Bearer ${bearerToken}`,
      'content-type': contentType
    }
    :
    {}
  const body = json ? CONTENT_TYPES.get(contentType)(json) : undefined
  const to = `${configEndpoint}/${url}`
  global.rdic.logger.log({}, '[CONNECTION_ATREEMO] [makeRequest]', { method, headers, bearerToken, contentType, body, config, configEndpoint })

  const response = await fetch(
    to,
    {
      method,
      headers,
      body
    }
  )
  if (!response.ok) {
    throw new Error(`!response.ok: [${to}]: ${await response.text()}`)
  }

  const asJson = await response.json()
  global.rdic.logger.log({}, '[CONNECTION_ATREEMO] [makeRequest] asJson', asJson)
  return asJson
}
