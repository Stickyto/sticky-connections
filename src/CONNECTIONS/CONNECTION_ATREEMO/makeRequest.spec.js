const makeRequest = require('./makeRequest')

const configDefaults = [
  'https://example.com',
  'username',
  'password'
]

global.fetch = jest.fn()
global.rdic = { logger: { log: jest.fn() } }

describe('makeRequest', () => {
  beforeEach(() => {
    fetch.mockClear()
    global.rdic.logger.log.mockClear()
  })

  it('should handle a GET request correctly', async () => {
    const mockResponse = { json: jest.fn().mockResolvedValue({ FirstName: 'Ultimate Test Contact' }) }
    fetch.mockResolvedValue(mockResponse)

    const response = await makeRequest(
      configDefaults,
      'get',
      'api/Contact/Get/110428',
    )

    expect(response.FirstName).toBe('Ultimate Test Contact')
    expect(fetch).toHaveBeenCalledWith(
      `${configDefaults[0]}/api/Contact/Get/110428`,
      {
        method: 'get',
        headers: {},
        body: undefined
      }
    )
  })

  it('should handle a POST request correctly', async () => {
    const mockResponse = { json: jest.fn().mockResolvedValue({ FirstName: 'Ultimate Test Contact' }) }
    fetch.mockResolvedValue(mockResponse)

    const response = await makeRequest(
      configDefaults,
      'post',
      'api/Contact/Post/110428',
      { someKey: 'someValue' },
      'application/json',
      'sampleBearerToken'
    )

    expect(response.FirstName).toBe('Ultimate Test Contact')
    expect(fetch).toHaveBeenCalledWith(
      `${configDefaults[0]}/api/Contact/Post/110428`,
      {
        method: 'post',
        headers: {
          'authorization': 'Bearer sampleBearerToken',
          'content-type': 'application/json'
        },
        body: '{"someKey":"someValue"}'
      }
    )
  })

  it('should handle error in request', async () => {
    fetch.mockRejectedValue(new Error('Network error'))

    await expect(
      makeRequest(
        configDefaults,
        'get',
        'api/Contact/Get/110428',
      )
    ).rejects.toThrow('Network error')
  })
})
