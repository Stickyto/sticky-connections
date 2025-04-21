const { assert } = require('@stickyto/openbox-node-utils')

module.exports = async function makeRequest(method, configEndpoint, json) {
  global.rdic.logger.log({}, '[CONNECTION_ZENDESK] [makeRequest]', { method, configEndpoint, json })
  const headers = new Headers({
    'Content-Type': 'application/json'
  })
  const response = await fetch(
    configEndpoint,
    {
      method,
      headers,
      body: JSON.stringify(json)
    }
  )

  assert(response.status === 200, `Failed: received a non-201 status code from Zapier (${response.status}).`)
  const body = await response.json()
  global.rdic.logger.log({}, '[CONNECTION_ZENDESK] [makeRequest] body', body)
}
