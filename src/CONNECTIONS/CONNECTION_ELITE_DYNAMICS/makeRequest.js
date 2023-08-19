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
  const [clientId, clientSecret, scope, oAuthUrl, XMLUrl] = config
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
    `${XMLUrl}/${codeUnit}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${xmlAccessToken}`,
        'content-type': 'text/xml',
        'SOAPAction': 'GetSetup'
      },
      body: requestXmlBody,
    }
  )

  if (!xmlBodyResponse.ok) {
    let rejection

    try {
      xmlBodyResponse.text()
      rejection = await parseResponse(await xmlBodyResponse.text(), '//faultstring/text()')
    } catch (e) {
      throw new Error(`HTTP ${xmlBodyResponse.status}.`)
    }
    throw new Error(rejection)
  }

  const brokenXml = await parseResponse(await xmlBodyResponse.text(), '//*[local-name()=\'return_value\']/text()')
  const fixedXml = fixXml(brokenXml)

  const asJson = parser.toJson(fixedXml, { object: true })

  global.rdic.logger.log({}, '[CONNECTION_ELITE_DYNAMICS] [makeRequest]', { brokenXml, fixedXml, asJson })

  return asJson
}
