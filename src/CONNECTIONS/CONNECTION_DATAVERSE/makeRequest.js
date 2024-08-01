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

  global.rdic.logger.log({}, '[CONNECTION_DATAVERSE] [makeRequest]', { token, method, url, config, json })
  const response = await fetch(`${configInstance}/api/data/v${configVersion}/${encodeURIComponent(url)}`,
    {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(json)
    }
  )

  const asJson = await response.json()
  global.rdic.logger.log({}, '[CONNECTION_DATAVERSE] [makeRequest]', { asJson })
  return asJson
}
