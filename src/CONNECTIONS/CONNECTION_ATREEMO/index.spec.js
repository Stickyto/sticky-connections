const { User, Application, CustomData } = require('openbox-entities')
const CONNECTION_ATREEMO = require('.')
const configDefaults = JSON.parse(process.env.CONFIG_DEFAULTS)

let user, application, customData

const createEvent = jest.fn()

beforeEach(() => {
  user = new User({})
  application = new Application({
    events: {
      on_load: [
        {
          'id': '0e1f0565-5e05-471c-b855-bbe44c20527d',
          'config': {
            'label': 'Name',
            'type': ' → Name',
            'value': '',
            'disabled': false,
            'required': false,
            'stashUser': false,
            'CONNECTION_ATREEMO--key': 'FirstName'
          }
        },
        {
          'id': '0e1f0565-5e05-471c-b855-bbe44c20527d',
          'config': {
            'label': 'Email',
            'type': ' → Email',
            'value': '',
            'disabled': false,
            'required': false,
            'stashUser': false,
            'CONNECTION_ATREEMO--key': 'Email'
          }
        },
        {
          'id': '100ada2b-1375-42c0-958a-49e7187a7d73',
          'config': {
            'label': 'Do you consent?',
            'value': false,
            'stashUser': false,
            'CONNECTION_ATREEMO--key': 'ProcessMydata'
          }
        }
      ]
    }
  })
  customData = new CustomData({
    'Name': 'Joe Bloggs',
    'Email': 'joe@bloggs.com',
    'Do you consent?': 'form--switch--TRUE'
  })
})

it('calls createEvent elegantly', async () => {
  const r = await CONNECTION_ATREEMO.eventHooks.LD_V2(configDefaults, { user, application, customData: customData.getRaw(), createEvent })
  expect(r.theirId).toBe(110429)
  expect(r.theirResponse.FirstName).toBe('Joe Bloggs')
})
