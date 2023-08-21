const got = require('got')
const parseResponse = require('./parseResponse/parseResponse')
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
  global.rdic.logger.log({}, '[CONNECTION_ELITE_DYNAMICS] [makeRequestV2]', { oauthBody })

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
  global.rdic.logger.log({}, '[CONNECTION_ELITE_DYNAMICS] [makeRequestV2]', { xmlAccessToken, requestXmlBody })

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
  const rawXml = '<?xml version="1.0" encoding="utf-8"?>' + response.body
  const highLevelJson = parser.toJson(rawXml, { object: true })['Soap:Envelope']['Soap:Body']
  const internalXml = highLevelJson[Object.keys(highLevelJson)[0]]['return_value']
  const finalJson = parser.toJson(internalXml, { object: true })
  global.rdic.logger.log({}, '[CONNECTION_ELITE_DYNAMICS] [makeRequestV2]', { finalJson })

  return finalJson
}
