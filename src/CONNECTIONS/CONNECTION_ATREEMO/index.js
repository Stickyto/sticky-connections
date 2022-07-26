/* eslint-disable quotes */
const { assert, isEmailValid } = require('openbox-node-utils')
const Connection = require('../Connection')
const makeRequest = require('./makeRequest')

const NAME = 'Atreemo'
const COLOR = '#2084f1'

const CONFIG_PER_APPLICATION_BLOCK = [
  {
    key: 'CONNECTION_ATREEMO--key',
    type: 'string',
    name: `${NAME} field name`,
    defaultValue: '',
    color: COLOR,
    inABox: true
  }
]

async function eventHookLogic (config, eventHookContainer) {
  const { user, application, thing, customData, createEvent } = eventHookContainer
  const [, configUsername, configPassword] = config
  assert(isEmailValid(configUsername), 'You have not set a valid username. It must be an email address.')

  const sourceId = [
    (thing ? `Sticky: ${thing.name}` : undefined),
    (application ? `Flow: ${application.name}` : undefined)
  ]
    .filter(_ => _)
    .join(' / ')

  const body = {
    SourceID: sourceId
  }
  application.events.on_load.map(ab => {
    const key = ab.config['CONNECTION_ATREEMO--key']
    if (key) {
      body[key] = customData[ab.config.label]
    }
  })

  try {
    const {
      access_token: bearerToken
    } = await makeRequest(
      config,
      'post',
      'token',
      {
        grant_type: 'password',
        username: configUsername,
        password: configPassword
      },
      'application/x-www-form-urlencoded'
    )
    const { CtcID: createdId } = await makeRequest(
      config,
      'post',
      'api/Contact/PostContact',
      body,
      'application/json',
      bearerToken
    )
  } catch (e) {
    createEvent({
      type: 'CONNECTION_BAD',
      userId: user.id,
      applicationId: application.id,
      customData: { id: 'CONNECTION_ATREEMO', message: e.message }
    })
  }
}

module.exports = new Connection({
  id: 'CONNECTION_ATREEMO',
  name: NAME,
  shortName: NAME.substring(0, 1),
  color: COLOR,
  logo: cdn => `${cdn}/connections/CONNECTION_ATREEMO.png`,
  configNames: [
    'Endpoint',
    'Username',
    'Password'
  ],
  configDefaults: [
    'https://atreemosandbox.atreemo.com',
    'sales@acme.co',
    ''
  ],
  instructionsDone: 'Form submissions and touchpoints will now go into Atreemo. Update each "Form → ..." flow step with a map to the right Atreemo field name.',
  configPerApplicationBlock: {
    '0e1f0565-5e05-471c-b855-bbe44c20527d': CONFIG_PER_APPLICATION_BLOCK,
    'c3b92e16-a631-48da-901b-e578cccfda7e': CONFIG_PER_APPLICATION_BLOCK,
    'd6765aa6-973a-4ed8-b307-d0bf0de989c0': CONFIG_PER_APPLICATION_BLOCK
  },
  eventHooks: {
    'LD_V2': eventHookLogic,
    'CHECK_IN': eventHookLogic
  }
})
