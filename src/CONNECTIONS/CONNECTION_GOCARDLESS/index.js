const { assert, services, isEmailValid } = require('@stickyto/openbox-node-utils')
const { User } = require('openbox-entities')
const Connection = require('../Connection')

const EMAIL_TO = 'accounts@sticky.to'

function doSucceed (rdic, createEvent, { customerObject, user, finalUser }) {
  const message = `GoCardless ${customerObject.id} connection to ${finalUser.name} successful!`
  createEvent({
    type: 'CONNECTION_GOOD',
    userId: user.id,
    customData: { id: 'CONNECTION_GOCARDLESS', message }
  })
  services.mail.quickSend(
    rdic,
    {
      subject: message,
      message: `
<p>GoCardless ID: ${customerObject.id}</p>
<p>GoCardless data: ${[customerObject.company_name, customerObject.given_name, customerObject.family_name].filter(_ => _).join(' ')}</p>
<p>Dashboard name: ${finalUser.name}</p>
<p>Dashboard ID: ${finalUser.id}</p>
`,
      to: EMAIL_TO
    }
  )
}

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
      message: `<p>GoCardless: ${message}</p><p>Dashboard ID: ${user.id}</p>`,
      to: EMAIL_TO
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
        const { user, updateUser } = connectionContainer
        const [apiKey] = config
        global.rdic.logger.log({ user }, '[CONNECTION_GOCARDLESS] [1]', { config, body })
        try {
          const applicableBodyElement = body.events.find(_ => _.resource_type === 'billing_requests' && _.action === 'fulfilled')
          global.rdic.logger.log({ user }, '[CONNECTION_GOCARDLESS] [2]', { applicableBodyElement })
          const { links: { customer: customerId } } = applicableBodyElement
          global.rdic.logger.log({ user }, '[CONNECTION_GOCARDLESS] [3]', { customerId })

          const res = await fetch(
            `https://api.gocardless.com/customers/${customerId}`,
            {
              method: 'GET',
              headers: {
                'GoCardless-Version': '2015-07-06',
                'Authorization': `Bearer ${apiKey}`
              }
            }
          )
          const json = await res.json()
          assert(!json.error, json.error ? JSON.stringify(json.error) : '???')
          const { customers: customerObject } = json
          global.rdic.logger.log({ user }, '[CONNECTION_GOCARDLESS] [4]', { json, customerObject })

          assert(isEmailValid(customerObject.email), `Object ${customerObject.id} email ${customerObject.email} does not pass our isEmailValid function.`)

          const { rows: [rawFinalUser] } = await rdic.get('datalayerRelational')._.sql(`SELECT * FROM users WHERE email='${customerObject.email}' OR billing_email='${customerObject.email}'`)
          assert(rawFinalUser, `A new sign up with ID ${customerObject.id} and email ${customerObject.email} (${[customerObject.company_name, customerObject.given_name, customerObject.family_name].filter(_ => _).join(' ')}) did not match any dashboards. Please connect manually.`)

          const finalUser = new User({}).fromDatalayerRelational(rawFinalUser)
          finalUser.directDebitRef = customerObject.id
          finalUser.billingEmail = customerObject.email
          await updateUser(finalUser)

          doSucceed(rdic, connectionContainer.createEvent, { customerObject, user, finalUser })

        } catch ({ message }) {
          doFail(rdic, connectionContainer.createEvent, message, { user })
          throw new Error(message)
        }
      }
    }
  }
})
