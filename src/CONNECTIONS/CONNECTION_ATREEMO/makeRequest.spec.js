const makeRequest = require('./makeRequest')

const configDefaults = [
  '',
  'username',
  'password'
]

const mockGet = jest.fn()
const mockPost = jest.fn()

jest.mock('got', () => {
  return {
    __esModule: true,
    'get': (...args) => mockGet(...args),
    'post': (...args) => mockPost(...args),
  }
})

global.rdic = { logger: { log: jest.fn() } }

describe('makeRequest', () => {
  beforeEach(() => {
    mockGet.mockClear()
    mockPost.mockClear()
    global.rdic.logger.log.mockClear()
  })

  it('should handle a GET request correctly', async () => {
    mockGet.mockResolvedValue({ body: '{"FirstName": "Ultimate Test Contact"}'})

    const response = await makeRequest(
      configDefaults,
      'get',
      'api/Contact/Get/110428',
    )

    expect(response.FirstName).toBe('Ultimate Test Contact')
    expect(mockGet).toHaveBeenCalledWith(
      `${configDefaults[0]}/api/Contact/Get/110428`,
      {
        headers: {},
        body: undefined
      }
    )
  })

  it('should handle a POST request correctly', async () => {
    mockPost.mockResolvedValue({ body: '{"FirstName": "Ultimate Test Contact"}'})

    const response = await makeRequest(
      configDefaults,
      'post',
      'api/Contact/Post/110428',
      { someKey: 'someValue' },
      'application/json',
      'sampleBearerToken'
    )

    expect(response.FirstName).toBe('Ultimate Test Contact')
    expect(mockPost).toHaveBeenCalledWith(
      `${configDefaults[0]}/api/Contact/Post/110428`,
      {
        headers: {
          'authorization': 'Bearer sampleBearerToken',
          'content-type': 'application/json'
        },
        body: '{"someKey":"someValue"}'
      }
    )
  })

  it('should handle error in request', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))

    await expect(
      makeRequest(
        configDefaults,
        'get',
        'api/Contact/Get/110428',
      )
    ).rejects.toThrow('Network error')
  })

})
