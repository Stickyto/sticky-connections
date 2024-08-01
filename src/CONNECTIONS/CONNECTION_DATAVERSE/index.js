const Connection = require('../Connection')
const makeRequest = require('./makeRequest')
const { assert } = require('@stickyto/openbox-node-utils')

const NAME = 'Dataverse'
const COLOR = '#0078d4'

const CONFIG_PER_APPLICATION_BLOCK = [
  {
    key: 'CONNECTION_DATAVERSE--key',
    type: 'string',
    name: `${NAME} field name`,
    defaultValue: '',
    color: COLOR,
    inABox: true
  }
]

async function eventHookLogic (config, connectionContainer) {
  const [_1, _2, _3, _4, _5, tableName] = config
  const { user, application, customData, createEvent } = connectionContainer
  const body = {}
  application.events.on_load.map(ab => {
    const key = ab.config['CONNECTION_DATAVERSE--key']
    if (key) {
      body[key] = customData[ab.config.label]
    }
  })
  try {
    const r = await makeRequest(config, 'post', tableName, body)
    assert(!r.error, `${r.error.code || '[code]'} / ${r.error.message || '[message]'}`)
  } catch (e) {
    createEvent({
      type: 'CONNECTION_BAD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      customData: { id: 'CONNECTION_DATAVERSE', message: e.message }
    })
  }
}

module.exports = new Connection({
  id: 'CONNECTION_DATAVERSE',
  name: NAME,
  shortName: NAME.substring(0, 1),
  color: COLOR,
  logo: cdn => `${cdn}/connections/CONNECTION_DATAVERSE.svg`,
  configNames: [
    'Instance URL',
    'Token URL',
    'Client ID',
    'Client secret',
    'Version (x.x)',
    'Table name'
  ],
  configDefaults: [
    'https://---.api.crm11.dynamics.com',
    'https://login.microsoftonline.com/---/oauth2/token',
    '',
    '',
    '9.2',
    'leads'
  ],
  instructions: ({ rdic, user, applications }) => [
    {
      'id': '71d05208-3781-4c24-996e-c4c0d1c6b228',
      'config': {
        'what': 'Form submissions and touchpoints will now go into Microsoft Dataverse. Update each "Form → ..." flow step with a map to the right Microsoft Dataverse field name.',
        'font': `${COLOR}--center--100%--false`,
        'icon': 'hand'
      }
    },
    {
      'id': '71d05208-3781-4c24-996e-c4c0d1c6b228',
      'config': {
        'what': 'Update each "Form → ..." flow step with a map to the right Microsoft Dataverse field name.',
        'font': `${COLOR}--center--100%--false`
      }
    }
  ],
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
