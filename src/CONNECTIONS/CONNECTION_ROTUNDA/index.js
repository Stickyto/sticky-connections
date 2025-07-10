const { assert } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')

async function getToken ({ configUrl, configApiKey }) {
  const response = await fetch(`https://${configUrl}/api/sticky/request_token`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${configApiKey}`
    }
  })
  assert(response.status === 200, `Request failed with status ${response.status}; check API key for ${configUrl} is correct.`)
  const { token } = await response.json()
  return token
}

async function eventHookLogic (config, connectionContainer) {
  const { rdic, user, application, thing, payment, customData, session, createEvent } = connectionContainer
  const [configUrl, configApiKey, configApplicationIds = ''] = config

  if (!application) {
    return
  }

  try {
    if (configApplicationIds.length > 0) {
      const realConfigApplicationIds = configApplicationIds.split(',')
      if (!realConfigApplicationIds.includes(application.id)) {
        return
      }
    }
    const token = await getToken({ configUrl, configApiKey })
    const userSector = session.userSectors.readFrom(user.id)
    const rBody = {
      member: userSector.readFrom(`${user.name} membership number`),
      pin: userSector.readFrom(`${user.name} pin`),
      value: payment.total.toFixed(2),
      transaction_id: payment.id
    }
    const response = await fetch(`https://${configUrl}/api/sticky/record_transaction`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(rBody)
    })
    const json = await response.json()
    assert(json.success === true, `Sorry, that's not right:\n\n${json.message}.`)
    createEvent({
      type: 'CONNECTION_GOOD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      thingId: thing ? thing.id : undefined,
      customData: { id: 'CONNECTION_ROTUNDA' }
    })
  } catch (e) {
    payment.onSessionFail(rdic, user, { whichConnection: 'CONNECTION_ROTUNDA' }, { customSubject: '⚠️ Your {name} top up was not successful', customMessage: '<p>We are sorry but your {name} top up was not successful.</p>' })
    createEvent({
      type: 'CONNECTION_BAD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      customData: { id: 'CONNECTION_ROTUNDA', message: e.message }
    })
  }
}

module.exports = new Connection({
  id: 'CONNECTION_ROTUNDA',
  type: 'CONNECTION_TYPE_ERP',
  name: 'Rotunda',
  color: '#EFA71E',
  logo: cdn => `${cdn}/connections/CONNECTION_ROTUNDA.png`,
  configNames: ['URL', 'API key', 'Flow IDs'],
  configDefaults: ['deluxe.rotunda.systems', '', ''],
  userIds: ['3e43c939-1d76-4238-b51d-a6e27a425677'],
  methods: {
    validate: {
      name: 'Validate',
      logic: async ({ connectionContainer, body, config }) => {
        const { membershipNumber, pin } = body
        const [configUrl, configApiKey] = config
        const token = await getToken({ configUrl, configApiKey })
        const response = await fetch(`https://${configUrl}/api/sticky/check_member_code`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: membershipNumber,
            pin: pin
          })
        })
        const json = await response.json()
        assert(json.success === true, `Sorry, that's not right:\n\n${json.message}.`)
        return [json.data.first_name, json.data.surname].filter(_ => _).join(' ')
      }
    }
  },
  eventHooks: {
    'SESSION_CART_PAY': eventHookLogic
  }
})
