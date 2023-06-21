const secrets = require('openbox-secrets')
const { assert } = require('@stickyto/openbox-node-utils')

const ENVIRONMENTS = new Map([
  [
    'Sandbox',
    {
      apiUrl: 'https://api.staging.deliverect.com',
      clientId: secrets.deliverect.Sandbox.clientId,
      clientSecret: secrets.deliverect.Sandbox.clientSecret
    }
  ],
  [
    'Production',
    {
      apiUrl: 'https://api.deliverect.com',
      clientId: secrets.deliverect.Production.clientId,
      clientSecret: secrets.deliverect.Production.clientSecret
    }
  ]
])

module.exports = function getEnvironment (_) {
  const foundEnvironment = ENVIRONMENTS.get(_)
  assert(foundEnvironment, `Environment ${_} doesn't exist!`)
  return foundEnvironment
}
