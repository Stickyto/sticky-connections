/* eslint-disable max-len */
const { AuthenticationContext } = require('adal-node')

module.exports = async function makeRequest(config, method, url, json) {
  const [configInstance, configTokenUrl, configClientId, configClientSecret, configVersion] = config
  const context = new AuthenticationContext(configTokenUrl)

  const token = await new Promise((resolve, reject) => {
    context.acquireTokenWithClientCredentials(configInstance, configClientId, configClientSecret, (e, r) => {
      !e && resolve(r.accessToken)
      e && reject(e)
    })
  })

  const response = await fetch(`${configInstance}/api/data/v${configVersion}/${url}`,
    {
      method,
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(json)
    }
  )

  global.rdic.logger.log({}, '[CONNECTION_DATAVERSE] [makeRequest]', { method, url, config, json })

  try {
    const body = await response.json()
    global.rdic.logger.log({}, '[CONNECTION_DATAVERSE] [makeRequest] body', body)

    return body
  } catch (e) {
    global.rdic.logger.log({}, '[CONNECTION_DATAVERSE] [makeRequest] body', e.message)

    return undefined
  }
}
