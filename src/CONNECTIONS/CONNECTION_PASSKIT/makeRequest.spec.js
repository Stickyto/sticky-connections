const makeRequest = require('./makeRequest')

// // Mocking the `got` library
// jest.mock('got', () => ({
//   get: jest.fn(),
//   post: jest.fn(),
//   // ... add other HTTP methods if required
// }))

global.fetch = jest.fn()

describe('makeRequest', () => {

  beforeEach(() => {
    global.rdic = {
      logger: {
        log: jest.fn(),
      },
    }
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should handle a successful JSON response', async () => {
    const mockApiKey = 'apiKey123'
    const mockMethod = 'get'
    const mockURL = 'https://example.com/api'
    const mockJSON = { data: 'test' }
    const mockResponse = { success: true }

    fetch.mockResolvedValue({ json: jest.fn().mockResolvedValue(mockResponse) })

    const result = await makeRequest(mockApiKey, mockMethod, mockURL, mockJSON)

    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PASSKIT] [makeRequest] apiKey', mockApiKey)
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PASSKIT] [makeRequest] method', mockMethod)
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PASSKIT] [makeRequest] url', mockURL)
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PASSKIT] [makeRequest] json', mockJSON)

    expect(fetch).toHaveBeenCalledWith(mockURL, {
      method: mockMethod,
      headers: {
        'Authorization': `Bearer ${mockApiKey}`
      },
      json: mockJSON
    })

    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PASSKIT] [makeRequest] toReturn', mockResponse)

    expect(result).toEqual(mockResponse)
  })

  it('should handle an empty response body', async () => {
    const mockApiKey = 'apiKey123'
    const mockMethod = 'post'
    const mockURL = 'https://example.com/api'
    const mockJSON = null
    const mockError = 'INVALID JSON'

    fetch.mockResolvedValue({ json: jest.fn().mockRejectedValue(mockError) })

    const result = await makeRequest(mockApiKey, mockMethod, mockURL, mockJSON)

    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PASSKIT] [makeRequest] apiKey', mockApiKey)
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PASSKIT] [makeRequest] method', mockMethod)
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PASSKIT] [makeRequest] url', mockURL)
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PASSKIT] [makeRequest] json', mockJSON)

    expect(fetch).toHaveBeenCalledWith(mockURL, {
      method: mockMethod,
      headers: {
        'Authorization': `Bearer ${mockApiKey}`
      },
      json: mockJSON
    })

    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PASSKIT] [makeRequest] error', mockError)

    expect(result).toBeUndefined()
  })
})