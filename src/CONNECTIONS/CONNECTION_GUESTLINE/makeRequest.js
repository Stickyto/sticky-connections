const got = require('got')
const { assert } = require('@stickyto/openbox-node-utils')
const parser = require('xml2json')

const BASE_URL = 'https://pmsws.eu.guestline.net/RLXSoapRouter/rlxsoap.asmx'

module.exports = async function makeRequest (soapAction, xml) {
  const responseObject = await got.post(
    BASE_URL,
    {
      headers: {
        'Content-Type': 'text/xml',
        'SOAPAction': soapAction
      },
      body: xml,
      throwHttpErrors: false
    }
  )
  global.rdic.logger.log({}, '[CONNECTION_GUESTLINE] [makeRequest] -> doing', { soapAction, xml, statusCode: responseObject.statusCode })
  assert(responseObject.statusCode === 200, responseObject.statusMessage)
  const asJson = parser.toJson(responseObject.body, { object: true })
  global.rdic.logger.log({}, '[CONNECTION_GUESTLINE] [makeRequest] -> done', { soapAction, asJson })
  return asJson['soap:Envelope']['soap:Body']
}