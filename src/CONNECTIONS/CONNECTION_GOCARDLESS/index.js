const { assert, services } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')

function doFail (rdic, createEvent, message, { user }) {
  createEvent({
    type: 'CONNECTION_BAD',
    userId: user.id,
    customData: { id: 'CONNECTION_GOCARDLESS', message }
  })
  services.mail.quickSend(
    rdic,
    {
      subject: `GoCardless: ${message}`,
      message: `<p>GoCardless:</p><p>${message}</p><p>Dashboard ID: ${user.id}</p>`,
      to: 'accounts@sticky.to'
    }
  )
}

module.exports = new Connection({
  id: 'CONNECTION_GOCARDLESS',
  name: 'GoCardless',
  color: '#18211c',
  logo: cdn => `${cdn}/connections/CONNECTION_GOCARDLESS.svg`,
  configNames: ['API key'],
  configDefaults: ['live_'],
  methods: {
    in: {
      name: 'In',
      logic: async ({ connectionContainer, config, body }) => {
        const { user } = connectionContainer
        const [apiKey] = config
        global.rdic.logger.log({ user }, '[CONNECTION_GOCARDLESS] [1]', { config, body })
        try {
          const applicableBodyElement = body.events.find(_ => _.resource_type === 'billing_requests' && _.action === 'fulfilled')
          global.rdic.logger.log({ user }, '[CONNECTION_GOCARDLESS] [2]', { applicableBodyElement })
          const { links: { customer: customerId } } = applicableBodyElement
          global.rdic.logger.log({ user }, '[CONNECTION_GOCARDLESS] [3]', { customerId })

          throw new Error('[WIP]')

          const res = await fetch(
            `https://api.gocardless.com/customers/${customerId}`,
            {
              method: 'GET',
              headers: {
                'GoCardless-Version': '2015-07-06',
                'Authorization': `Bearer apiKey`
              }
            }
          )
          const json = await res.json()
          const { customers: customerObject } = res
          global.rdic.logger.log({ user }, '[CONNECTION_GOCARDLESS] [4]', { customerObject })

          // {
          //   "customers": {
          //     "id": "CU01M132ZQ7XCN",
          //     "created_at": "2026-04-21T19:29:41.589Z",
          //     "email": "test_1@sticky.to",
          //     "given_name": "GN",
          //     "family_name": "FN",
          //     "company_name": null,
          //     "address_line1": "18 X Street",
          //     "address_line2": null,
          //     "address_line3": null,
          //     "city": "Brighouse",
          //     "region": null,
          //     "postal_code": "ABC DEF",
          //     "country_code": "GB",
          //     "language": "en",
          //     "swedish_identity_number": null,
          //     "danish_identity_number": null,
          //     "phone_number": null,
          //     "metadata": {}
          //   }
          // }

        } catch ({ message }) {
          doFail(rdic, connectionContainer.createEvent, `Query failed (${message})`, { user })
        }
      }
    }
  }
})
