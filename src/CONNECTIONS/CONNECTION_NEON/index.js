const { Agent } = require('undici')
const { assert } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')

const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } })

async function getToken ({ configHost, configUsername, configPassword }) {
  const body = new URLSearchParams()
  body.append('grant_type', 'password')
  body.append('username', configUsername)
  body.append('password', configPassword)
  body.append('scope', 'neon_customersearch_api')
  body.append('client_id', 'thirdparty')

  const url = `https://identity.${configHost}/server/connect/token`
  const response = await fetch(
    url,
    {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      dispatcher: insecureAgent
    }
  )

  assert(response.status === 200, `Request failed with status ${response.status}; check password for ${configUsername}@${configHost} is correct.`)
  const { access_token: token } = await response.json()
  return token
}

module.exports = new Connection({
  id: 'CONNECTION_NEON',
  name: 'Neon',
  type: 'CONNECTION_TYPE_ERP',
  color: '#0088cc',
  logo: cdn => `${cdn}/connections/CONNECTION_NEON.svg`,
  configNames: ['Host', 'Username', 'Password'],
  configDefaults: ['thirdparty.neon.casino', '', ''],
  methods: {
    validate: {
      name: 'Validate',
      logic: async ({ connectionContainer, body, config }) => {
        const { customerNumber, firstName } = body
        const [configHost, configUsername, configPassword] = config
        const token = await getToken({ configHost, configUsername, configPassword })
        const response = await fetch(
          `https://customer.${configHost}/search/api/CustomerSearch?CustomerNo=${encodeURIComponent(customerNumber)}&Forename=${encodeURIComponent(firstName)}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            dispatcher: insecureAgent
          }
        )
        assert(response.status === 200, "Sorry, those details aren't right.")
        const asJson = await response.json()
        assert(Array.isArray(asJson) && asJson.length > 0, "Sorry, those details aren't right.")
        return {
          fullName: asJson[0].fullName,
          membership: asJson[0].membershipTypeName
        }
      }
    }
  }
})
