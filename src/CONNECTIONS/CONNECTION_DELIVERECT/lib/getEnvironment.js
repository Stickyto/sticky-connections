const { env, assert } = require('@stickyto/openbox-node-utils')

const ENVIRONMENTS = new Map([
  [
    'Sandbox',
    {
      apiUrl: 'https://api.staging.deliverect.com',
      clientId: env.get('DELIVERECT_SANDBOX_CLIENT_ID'),
      clientSecret: env.get('DELIVERECT_SANDBOX_CLIENT_SECRET')
    }
  ],
  [
    'Production',
    {
      apiUrl: 'https://api.deliverect.com',
      clientId: env.get('DELIVERECT_PRODUCTION_CLIENT_ID'),
      clientSecret: env.get('DELIVERECT_PRODUCTION_CLIENT_SECRET')
    }
  ]
])

module.exports = function getEnvironment (_) {
  const foundEnvironment = ENVIRONMENTS.get(_)
  assert(foundEnvironment, `Environment ${_} doesn't exist!`)
  return foundEnvironment
}
