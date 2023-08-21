const { assert } = require('@stickyto/openbox-node-utils')
const makeRequest = require('../makeRequest')

module.exports = async function logIn (configuration) {
  const [siteId, interfaceId, operatorCode, password] = configuration
  const soapAction = 'http://tempuri.org/RLXSOAP19/RLXSOAP19/LogIn'
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <LogIn xmlns="http://tempuri.org/RLXSOAP19/RLXSOAP19">
      <SiteID>${siteId}</SiteID>
      <InterfaceID>${interfaceId}</InterfaceID>
      <OperatorCode>${operatorCode}</OperatorCode>
      <Password>${password}</Password>
    </LogIn>
  </soap:Body>
</soap:Envelope>
`
  const r = await makeRequest(soapAction, xml)
  assert(r.LogInResponse.LogInResult.ExceptionCode === '0', r.LogInResponse.LogInResult.ExceptionDescription)
  return r.LogInResponse.SessionID
}
