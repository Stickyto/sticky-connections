const { assert } = require('@stickyto/openbox-node-utils')
const parser = require('xml2json')

const BASE_URL = 'https://pmsws.eu.guestline.net/RLXSoapRouter/rlxsoap.asmx'

module.exports = async function makeRequest (soapAction, xml) {
  const response = await fetch(
    BASE_URL,
    {
      method: 'POST',
      headers: {
        'content-type': 'text/xml',
        'SOAPAction': soapAction
      },
      body: xml
    }
  )
  global.rdic.logger.log({}, '[CONNECTION_GUESTLINE] [makeRequest] -> doing', { soapAction, xml, status: response.status })
  assert(response.status === 200, `HTTP ${response.status}!`)
  const asText = await response.text()
  const asJson = parser.toJson(asText, { object: true })
  global.rdic.logger.log({}, '[CONNECTION_GUESTLINE] [makeRequest] -> done', { soapAction, asText, asJson })
  return asJson['soap:Envelope']['soap:Body']
}
