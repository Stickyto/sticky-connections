const parseResponse = require('./parseResponse/parseResponse')
const got = require('got')

// step 1: oauth
// step 2: use native fetch / whatever we do to make a http request

function getFormHttpBody(params) {
  return Object.keys(params)
    .filter(key => typeof params[key] === 'string' || typeof params[key] === 'number')
    .map(key => {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
    }).join('&')
}

module.exports = async (requestXMLBody, config) => {
  const [clientId, clientSecret, scope, oAuthUrl, XMLUrl] = config
  const payload = getFormHttpBody({
    'client_id': clientId,
    'client_secret': clientSecret,
    'grant_type': 'client_credentials',
    scope
  })
  console.warn('xxx payload', payload)
  // return {}

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded'
  }

  const { body: bodyAsString } = await got.post(
    oAuthUrl,
    {
      headers,
      body: payload
    }
  )

  const { access_token } = JSON.parse(bodyAsString)

  console.log('DANESH bodyJSON: ', access_token)

  const headersBusinessCentral = {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'text/xml',
    'SOAPAction': 'GetSetup'
  }

  console.log('Danesh requestXMLBody: ', requestXMLBody)

  const response = await got.post(
    XMLUrl,
    {
      headers: headersBusinessCentral,
      body: requestXMLBody,
      throwHttpErrors: false
    }
  )

  if (response.statusCode !== 200) {
    const rejection = response.body ? await parseResponse(response.body, '//faultstring/text()') : `HTTP ${response.statusCode}.`
    throw new Error(rejection)
  }
  const resolution = await parseResponse(response.body, '//*[local-name()=\'return_value\']/text()')

  console.log('Danesh resolution: ', resolution)
  return resolution
}
