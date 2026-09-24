const { assert } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_NEON',
  name: 'Neon',
  type: 'CONNECTION_TYPE_ERP',
  color: '#0088cc',
  logo: cdn => `${cdn}/connections/CONNECTION_NEON.svg`,
  configNames: ['Neon2Cloud UUID', 'Neon2Cloud Secret key'],
  configDefaults: ['', ''],
  methods: {
    validate: {
      name: 'Validate',
      logic: async ({ config, body }) => {
        const { customerNumber, firstName } = body
        const [_configUuid, _configSecretKey] = config
        const response = await fetch(
          `https://neon2cloud-${_configUuid}.ngrok.dev/members/${encodeURIComponent(customerNumber)}`,
          {
            headers: {
              Authorization: `Bearer ${_configSecretKey}`
            }
          }
        )
        console.info('[CONNECTION_NEON] Member lookup response', {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          redirected: response.redirected,
          ngrokErrorCode: response.headers.get('ngrok-error-code')
        })
        if (response.status !== 200) {
          const responseBody = await response.text().catch(error => `Could not read response body: ${error.message}`)
          console.error('[CONNECTION_NEON] Member lookup failed', {
            status: response.status,
            responseBody: responseBody.slice(0, 2000)
          })
        }
        assert(response.status !== 404, "Sorry, that membership number isn't right.")
        assert(response.status === 200, 'Sorry, we could not check your membership right now. Please try again.')
        const asJson = await response.json()
        assert(
          typeof firstName === 'string' &&
          typeof asJson?.Forename === 'string' &&
          firstName.trim().toLowerCase() === asJson.Forename.trim().toLowerCase(),
          "Your membership number is correct but your first name doesn't match."
        )
        return {
          fullName: [asJson.Forename.trim(), (asJson.Surname || '').trim()].filter(Boolean).join(' '),
          loyaltyBalance: asJson.LoyaltyBalance,
          loyaltyPointsAvailable: asJson.LoyaltyPointsAvailable,
          membershipTypeName: asJson.MembershipTypeName
        }
      }
    }
  }
})
