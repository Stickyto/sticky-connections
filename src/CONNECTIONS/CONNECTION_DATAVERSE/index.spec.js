const { User, Application, CustomData } = require('openbox-entities')
const CONNECTION_DATAVERSE = require('.')

const config = {}
let user, application, customData

beforeEach(() => {
  user = new User({})
  application = new Application({
    events: {
      on_load: [
        {
          'id': '0e1f0565-5e05-471c-b855-bbe44c20527d',
          'config': {
            'label': 'Industry',
            'type': 'Text',
            'value': '899310000',
            'disabled': false,
            'required': false,
            'stashUser': false,
            'isHidden': true,
            'CONNECTION_DATAVERSE--key': 'industrycode'
          }
        },
        {
          'id': '0e1f0565-5e05-471c-b855-bbe44c20527d',
          'config': {
            'label': 'Company Name',
            'type': ' → Company name',
            'value': '',
            'disabled': false,
            'required': false,
            'stashUser': false,
            'CONNECTION_DATAVERSE--key': 'companyname'
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
            'CONNECTION_DATAVERSE--key': 'favouritecolor'
          }
        }
      ]
    }
  })
  customData = new CustomData({
    'Industry': '899310000',
    'Company Name': 'My cool company',
    'Favourite colour?': 'Green'
  })
})

it('calls makeRequest with something', async () => {
  const result = await CONNECTION_DATAVERSE.eventHooks.LD_V2(config, user, application, customData.getRaw())
  expect(result).toMatchObject({
    'companyname': 'My cool company',
    'industrycode': '899310000',
    'favouritecolor': 'Green'
  })
})
