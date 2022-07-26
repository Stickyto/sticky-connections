const { User, Application, CustomData } = require('openbox-entities')
const CONNECTION_ATREEMO = require('.')

const config = {}
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
          'id': 'c3b92e16-a631-48da-901b-e578cccfda7e',
          'config': {
            'label': 'Favourite colour?',
            'list': [
              'Red',
              'Green',
              'Blue'
            ],
            'stashUser': false,
            'CONNECTION_ATREEMO--key': 'favouritecolor'
          }
        }
      ]
    }
  })
  customData = new CustomData({
    'Name': 'Joe Bloggs',
    'Favourite colour?': 'Green'
  })
})

it('calls createEvent elegantly', async () => {
  await CONNECTION_ATREEMO.eventHooks.LD_V2(config, { user, application, customData: customData.getRaw(), createEvent })
  expect(createEvent).toHaveBeenCalled()
})
