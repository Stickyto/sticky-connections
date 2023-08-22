const parseResponse = require('./parseResponse/parseResponse')
const { decode: fixXml } = require('html-entities')
const parser = require('xml2json')
const { assert } = require('@stickyto/openbox-node-utils')

function getFormHttpBody(params) {
  return Object.keys(params)
    .filter(key => typeof params[key] === 'string' || typeof params[key] === 'number')
    .map(key => {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
    }).join('&')
}

module.exports = async (url, requestXmlBody, config, method = 'POST', contentType = 'text/xml') => {
  const [clientId, clientSecret, scope, oAuthUrl] = config
  const oauthBody = getFormHttpBody({
    'client_id': clientId,
    'client_secret': clientSecret,
    'grant_type': 'client_credentials',
    scope
  })
  global.rdic.logger.log({}, '[CONNECTION_ELITE_DYNAMICS] [makeRequest]', { oauthBody })

  const xmlAccessTokenresponse = await fetch(
    oAuthUrl,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: oauthBody
    }
  )

  let xmlAccessToken
  try {
    xmlAccessToken = await xmlAccessTokenresponse.json()
  } catch (e) {
    throw new Error(e.message)
  }
  global.rdic.logger.log({}, '[CONNECTION_ELITE_DYNAMICS] [makeRequest]', { xmlAccessToken, requestXmlBody })

  const xmlBodyResponse = await fetch(
    url,
    {
      method,
      headers: {
        'authorization': `Bearer ${xmlAccessToken.access_token}`,
        'content-type': contentType,
        'SOAPAction': 'GetSetup'
      },
      body: requestXmlBody
    }
  )

  if (contentType === 'application/json') {
    const asJson = await xmlBodyResponse.json()
    assert(!asJson.error, asJson.error && asJson.error.message)
    return asJson
  }

  if (contentType === 'text/xml') {
    const asText = await xmlBodyResponse.text()
    if (!xmlBodyResponse.ok) {
      let rejection
      try {
        rejection = await parseResponse(asText, '//faultstring/text()')
      } catch (e) {
        rejection = `Not working (${xmlBodyResponse.status})!`
      }
      throw new Error(rejection)
    }
    const brokenXml = await parseResponse(asText, '//*[local-name()=\'return_value\']/text()')
    const fixedXml = fixXml(brokenXml)
    const asJson = parser.toJson(fixedXml, { object: true })
    global.rdic.logger.log({}, '[CONNECTION_ELITE_DYNAMICS] [makeRequest]', { brokenXml, fixedXml, asJson })
    return asJson
  }

  throw new Error(`contentType "${contentType}" did not get processed; this is bad.`)
}
