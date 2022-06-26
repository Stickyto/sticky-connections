/* eslint-disable max-len */
const got = require('got')
const { AuthenticationContext } = require('adal-node')

module.exports = async function makeRequest (config, method, url, json) {
  const [configInstance, configTokenUrl, configClientId, configClientSecret, configVersion] = config
  const context = new AuthenticationContext(configTokenUrl)

  const token = await new Promise((resolve, reject) => {
    context.acquireTokenWithClientCredentials(configInstance, configClientId, configClientSecret, (e, r) => {
      !e && resolve(r.accessToken)
      e && reject(e)
    })
  })

  const { body: bodyAsString } = await got[method](
    `${configInstance}/api/data/v${configVersion}/${url}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      json
    }
  )
  const toReturn = typeof bodyAsString === 'string' ? JSON.parse(bodyAsString) : undefined

  global.rdic.logger.log({}, '[CONNECTION_DATAVERSE] [makeRequest] config', config)
  global.rdic.logger.log({}, '[CONNECTION_DATAVERSE] [makeRequest] method', method)
  global.rdic.logger.log({}, '[CONNECTION_DATAVERSE] [makeRequest] url', url)
  global.rdic.logger.log({}, '[CONNECTION_DATAVERSE] [makeRequest] json', json)
  global.rdic.logger.log({}, '[CONNECTION_DATAVERSE] toReturn', toReturn)

  return toReturn
}
