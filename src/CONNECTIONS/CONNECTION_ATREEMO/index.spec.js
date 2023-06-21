const { User, Application } = require('openbox-entities')
const CONNECTION_ATREEMO = require('.')

const configDefaults = ['', 'username@email.com', 'password']

let user, application

const createEvent = jest.fn()
const mockMakeRequest = jest.fn()

jest.mock('./makeRequest', () => {
  return () => mockMakeRequest()
})

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
})

it('calls createEvent elegantly', async () => {
  mockMakeRequest.mockResolvedValueOnce({access_token: ''})
  mockMakeRequest.mockResolvedValueOnce({CtcID: 110429, FirstName: 'Joe Bloggs'})

  const response = await CONNECTION_ATREEMO.eventHooks.LD_V2(configDefaults, { user, application, customData: {}, createEvent })

  expect(response.theirId).toBe(110429)
  expect(response.theirResponse.FirstName).toBe('Joe Bloggs')
})
