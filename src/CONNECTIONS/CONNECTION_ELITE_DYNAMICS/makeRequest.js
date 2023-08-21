const parseResponse = require('./parseResponse/parseResponse')
const { decode: fixXml } = require('html-entities')
const parser = require('xml2json')

function getFormHttpBody(params) {
  return Object.keys(params)
    .filter(key => typeof params[key] === 'string' || typeof params[key] === 'number')
    .map(key => {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
    }).join('&')
}

module.exports = async (requestXmlBody, config, codeUnit) => {
  const [clientId, clientSecret, scope, oAuthUrl, urlXml] = config
  const oauthBody = getFormHttpBody({
    'client_id': clientId,
    'client_secret': clientSecret,
    'grant_type': 'client_credentials',
    scope
  })
  global.rdic.logger.log({}, '[CONNECTION_ELITE_DYNAMICS] [makeRequest]', { oauthBody })

  const xmlAccessTokenresponse = await fetch(oAuthUrl,
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
    `${urlXml}/${codeUnit}`,
    {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${xmlAccessToken.access_token}`,
        'content-type': 'text/xml',
        'SOAPAction': 'GetSetup'
      },
      body: requestXmlBody,
    }
  )

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
