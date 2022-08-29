const { assert } = require('openbox-node-utils')
const makeRequest = require('./makeRequest')

module.exports = async function getToken (config) {
  const [,,, apiEndpoint, apiClientId, apiClientSecret] = config
  const body = {
    'audience': apiEndpoint,
    'grant_type': 'token',
    'client_id': apiClientId,
    'client_secret': apiClientSecret
  }
  const r = await makeRequest(undefined, 'post', `${apiEndpoint}/oauth/token`, body)
  assert(typeof r.access_token, `[getToken] failed (${r.code}/${r.description})`)
  return r.access_token
}
