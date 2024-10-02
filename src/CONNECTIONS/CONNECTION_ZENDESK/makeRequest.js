

const { assert } = require('@stickyto/openbox-node-utils')

module.exports = async function makeRequest(method, configEndpoint, configEmail, configApiKey, json) {
  global.rdic.logger.log({}, '[CONNECTION_ZENDESK] [makeRequest]', { method, configEndpoint, configEmail, configApiKey, json })
  const headers = new Headers({
    'Authorization': 'Basic ' + Buffer.from(`${configEmail}/token:${configApiKey}`).toString('base64'),
    'Content-Type': 'application/json'
  })
  const response = await fetch(`https://${configEndpoint}/api/v2/tickets`,
    {
      method,
      headers,
      body: JSON.stringify(json)
    }
  )

  assert(response.status === 201, `Failed: received a non-201 status code from Zendesk (${response.status}).`)
  const body = await response.json()
  global.rdic.logger.log({}, '[CONNECTION_ZENDESK] [makeRequest] body', body)
}
