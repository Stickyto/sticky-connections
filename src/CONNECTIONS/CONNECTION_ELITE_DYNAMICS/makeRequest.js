const got = require('got')
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

  const { body: bodyAsString } = await got.post(
    oAuthUrl,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: oauthBody
    }
  )

  const { access_token: xmlAccessToken } = JSON.parse(bodyAsString)
  global.rdic.logger.log({}, '[CONNECTION_ELITE_DYNAMICS] [makeRequest]', { xmlAccessToken, requestXmlBody })

  const response = await got.post(
    `${XMLUrl}/${codeUnit}`,
    {
      headers: {
        'Authorization': `Bearer ${xmlAccessToken}`,
        'Content-Type': 'text/xml',
        'SOAPAction': 'GetSetup'
      },
      body: requestXmlBody,
      throwHttpErrors: false
    }
  )

  if (response.statusCode !== 200) {
    const rejection = response.body ? await parseResponse(response.body, '//faultstring/text()') : `HTTP ${response.statusCode}.`
    throw new Error(rejection)
  }
  const brokenXml = await parseResponse(response.body, '//*[local-name()=\'return_value\']/text()')
  const fixedXml = fixXml(brokenXml)

  const asJson = parser.toJson(fixedXml, { object: true })

  global.rdic.logger.log({}, '[CONNECTION_ELITE_DYNAMICS] [makeRequest]', { brokenXml, fixedXml, asJson })

  return asJson
}
