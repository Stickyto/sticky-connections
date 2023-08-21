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
    `${XMLUrl}/${codeUnit}`,
    {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${xmlAccessToken}`,
        'content-type': 'text/xml',
        'SOAPAction': 'GetSetup'
      },
      body: requestXmlBody
    }
  )

  const asText = await xmlBodyResponse.text()
  if (!xmlBodyResponse.ok) {
    const rejection = asText ? await parseResponse(asText, '//faultstring/text()') : `HTTP ${xmlBodyResponse.status}.`
    throw new Error(rejection)
  }
  const rawXml = '<?xml version="1.0" encoding="utf-8"?>' + asText
  const highLevelJson = parser.toJson(rawXml, { object: true })['Soap:Envelope']['Soap:Body']
  const internalXml = highLevelJson[Object.keys(highLevelJson)[0]]['return_value']
  const finalJson = parser.toJson(internalXml, { object: true })
  global.rdic.logger.log({}, '[CONNECTION_ELITE_DYNAMICS] [makeRequestV2]', { finalJson })

  return finalJson
}
