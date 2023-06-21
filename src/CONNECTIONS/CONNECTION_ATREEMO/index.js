const { assert, deserialize, isEmailValid, unformatPhone } = require('@stickyto/openbox-node-utils')
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

async function eventHookLogic (config, connectionContainer) {
  const { user, application, customData, createEvent } = connectionContainer
  const [, configUsername, configPassword] = config
  assert(isEmailValid(configUsername), 'You have not set a valid username. It must be an email address.')

  // const sourceId = [
  //   (thing ? `Sticky: ${thing.name}` : undefined),
  //   (application ? `Flow: ${application.name}` : undefined)
  // ]
  //   .filter(_ => _)
  //   .join(' / ')

  const body = {
    SourceID: 'Sticky'
  }
  application.events.on_load.map(ab => {
    const key = ab.config['CONNECTION_ATREEMO--key']
    if (key) {
      let deserializedValue = customData[ab.config.label]
      deserializedValue = deserialize(deserializedValue, user, true)
      if (ab.config['type'] === ' → Phone') {
        deserializedValue = unformatPhone(deserializedValue, user.country)
      }
      body[key] = deserializedValue
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
    const { CtcID: theirId, ...theirResponse } = await makeRequest(
      config,
      'post',
      'api/Contact/PostContact',
      body,
      'application/json',
      bearerToken
    )
    return {
      theirId,
      theirResponse
    }
  } catch (e) {
    console.log(e)

    createEvent({
      type: 'CONNECTION_BAD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
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
  instructions: [
    {
      'id': '71d05208-3781-4c24-996e-c4c0d1c6b228',
      'config': {
        'what': 'Form submissions and touchpoints will now go into Atreemo. Update each "Form → ..." flow step with a map to the right Atreemo field name.',
        'font': `${COLOR}--center--100%--false`,
        'icon': 'hand'
      }
    },
    {
      'id': '71d05208-3781-4c24-996e-c4c0d1c6b228',
      'config': {
        'what': 'Update each "Form → ..." flow step with a map to the right Atreemo field name.',
        'font': `${COLOR}--center--100%--false`
      }
    }
  ],
  configPerApplicationBlock: {
    '0e1f0565-5e05-471c-b855-bbe44c20527d': CONFIG_PER_APPLICATION_BLOCK,
    'c3b92e16-a631-48da-901b-e578cccfda7e': CONFIG_PER_APPLICATION_BLOCK,
    'd6765aa6-973a-4ed8-b307-d0bf0de989c0': CONFIG_PER_APPLICATION_BLOCK,
    '100ada2b-1375-42c0-958a-49e7187a7d73': CONFIG_PER_APPLICATION_BLOCK
  },
  eventHooks: {
    'LD_V2': eventHookLogic,
    'CHECK_IN': eventHookLogic
  }
})
