const makeRequest = require('./makeRequest')

global.fetch = jest.fn()

describe('makeRequest', () => {
  beforeEach(() => {
    global.rdic = {
      logger: {
        log: jest.fn()
      }
    }
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should make a request with correct parameters and return valid JSON response', async () => {
    const mockPrivateKey = 'testPrivateKey'
    const mockMethod = 'GET'
    const mockUrl = 'https://api.example.com/test-endpoint'
    const mockJson = { key: 'value' }
    const mockResponse = { success: true }

    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce(mockResponse)
    })

    const result = await makeRequest(mockPrivateKey, mockMethod, mockUrl, mockJson)

    expect(fetch).toHaveBeenCalledWith(mockUrl, {
      method: mockMethod,
      headers: {
        'Authorization': `Bearer ${mockPrivateKey}`
      },
      body: JSON.stringify(mockJson)
    })

    expect(result).toEqual({ success: true })
  })

  it('should return undefined for an empty response body', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockRejectedValueOnce('')
    })

    const result = await makeRequest('testPrivateKey', 'GET', 'https://api.example.com/test-endpoint', {})

    expect(result).toBeUndefined()
  })

  it('should make a request without Authorization header if no privateKey provided', async () => {
    const mockResponse = JSON.stringify({ success: true })

    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce(mockResponse)
    })

    await makeRequest(null, 'GET', 'https://api.example.com/test-endpoint', {})

    expect(fetch).toHaveBeenCalledWith('https://api.example.com/test-endpoint', expect.objectContaining({
      headers: {}
    }))
  })

  it('should return undefined and log an error for invalid JSON response', async () => {
    const mockError = { message: 'invalid json' }

    fetch.mockResolvedValueOnce({
      json: jest.fn().mockRejectedValueOnce(mockError)
    })

    const result = await makeRequest('testPrivateKey', 'GET', 'https://api.example.com/test-endpoint', {})

    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_API] [makeRequest] error', mockError.message)
    expect(result).toBeUndefined()
  })
})
