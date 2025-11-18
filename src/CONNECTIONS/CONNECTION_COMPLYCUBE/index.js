const { assert, services, isUrl, isEmailValid } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')

async function makeRequest (apiKey, url, body) {
  global.rdic.logger.log({}, '[CONNECTION_COMPLYCUBE] [makeRequest] 1', { apiKey, url, body })
  const response = await fetch(
    `https://api.complycube.com/${url}`,
    {
      method: 'post',
      body: JSON.stringify(body),
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      }
    }
  )
  global.rdic.logger.log({}, '[CONNECTION_COMPLYCUBE] [makeRequest] 2', { responseOk: response.ok, responseStatus: response.status })
  const asJson = await response.json()
  if (!response.ok) {
    const asString = JSON.stringify(asJson, null, 2)
    throw new Error(asString)
  }
  global.rdic.logger.log({}, '[CONNECTION_COMPLYCUBE] [makeRequest] 3', { asJson })
  return asJson
}

async function eventHookLogic (config, connectionContainer) {
  const { user, application, customData, createEvent } = connectionContainer
  const [cApiKey, cUrlSuccess, cUrlFailure] = config

  try {
    assert(isUrl(cUrlSuccess), 'You need to set a "Success URL".')
    assert(isUrl(cUrlFailure), 'You need to set a "Failure URL".')

    ;[
      'Email',
      'First name',
      'Last name'
    ]
      .forEach(k => {
        assert(typeof customData[k] === 'string', `Field with key ${k} is not in customData!`)
      })

    const toEmail = customData['Email']
    assert(isEmailValid(toEmail), '"Email" field was not an email.')

    const makeRequestBody = {
      'type': 'person',
      'email': toEmail,
      'personDetails': {
        'firstName': customData['First name'],
        'lastName': customData['Last name']
      }
    }
  
    const { id: clientId } = await makeRequest(
      cApiKey,
      'v1/clients',
      makeRequestBody
    )

    const { redirectUrl } = await makeRequest(
      cApiKey,
      'v1/flow/sessions',
      {
        'clientId': clientId,
        'checkTypes': ['extensive_screening_check', 'identity_check', 'document_check'],
        'successUrl': cUrlSuccess,
        'cancelUrl': cUrlFailure
      }
    )

    const subject = `${user.name} has sent you a secure link to verify your identity`
    const message =
`
<p>${user.name} has sent you a secure link to verify your identity.</p>
<p><a href="${redirectUrl}"><strong>Verify your identify now</strong></a></p>
`

    services.mail.quickSend(rdic, { user, subject, message, to: toEmail })

    createEvent(
      rdic,
      'DESTINATION',
      req,
      {
        user,
        customData: {
          type: 'Email',
          destination: toEmail
        }
      }
    )

  } catch (e) {
    createEvent({
      type: 'CONNECTION_BAD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      customData: { id: 'CONNECTION_COMPLYCUBE', message: e.message }
    })
  }
}

module.exports = new Connection({
  id: 'CONNECTION_COMPLYCUBE',
  name: 'ComplyCube',
  type: 'CONNECTION_TYPE_ERP',
  color: '#1683FB',
  logo: cdn => `${cdn}/connections/CONNECTION_COMPLYCUBE.svg`,
  configNames: ['API key', 'Success URL', 'Failure URL'],
  configDefaults: ['', '', ''],
  eventHooks: {
    'LD_V2': eventHookLogic
  }
})
