const { assert } = require('@stickyto/openbox-node-utils')
const getEnvironment = require('./getEnvironment')
const makeRequest = require('./makeRequest')

module.exports = async function getToken (config) {
  const [environment] = config
  const foundEnvironment = getEnvironment(environment)
  const body = {
    'audience': foundEnvironment.apiUrl,
    'grant_type': 'token',
    'client_id': foundEnvironment.clientId,
    'client_secret': foundEnvironment.clientSecret
  }
  const r = await makeRequest(undefined, 'post', `${foundEnvironment.apiUrl}/oauth/token`, body)
  assert(typeof r.access_token, `[getToken] failed (${r.code}/${r.description})`)
  return r.access_token
}
