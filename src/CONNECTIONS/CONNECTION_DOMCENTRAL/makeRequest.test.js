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
    const mockMethod = 'GET'
    const mockUrl = 'https://api.example.com/test-endpoint'
    const mockJson = { key: 'value' }
    const mockHeaders = { 'content-type': 'application/json' }
    const mockResponse = { success: true }

    global.fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce(mockResponse)
    })

    const result = await makeRequest(mockMethod, mockUrl, mockJson, mockHeaders)

    expect(fetch).toHaveBeenCalledWith(mockUrl, {
      method: mockMethod,
      headers: mockHeaders,
      body: JSON.stringify(mockJson)
    })

    expect(result).toEqual({ success: true })
  })

  it('should return undefined for an empty response body', async () => {
    global.fetch.mockResolvedValueOnce({
      json: jest.fn().mockRejectedValue('')
    })

    const result = await makeRequest('GET', 'https://api.example.com/test-endpoint', {}, {})

    expect(result).toBeUndefined()
  })

  it('should make a request with headers if provided', async () => {
    const mockHeaders = { 'Authorization': 'Bearer xyz' }
    const mockResponse = JSON.stringify({ authenticated: true })

    global.fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce(mockResponse)
    })

    await makeRequest('GET', 'https://api.example.com/test-endpoint', {}, mockHeaders)

    expect(fetch).toHaveBeenCalledWith('https://api.example.com/test-endpoint', expect.objectContaining({
      headers: mockHeaders
    }))
  })

  it('should return undefined and log an error for invalid JSON response', async () => {
    const mockMethod = 'GET'
    const mockUrl = 'https://api.example.com/test-endpoint'
    const mockError = { message: 'invalid json' }

    global.fetch.mockResolvedValueOnce({
      json: jest.fn().mockRejectedValue(mockError)
    })

    const result = await makeRequest('GET', 'https://api.example.com/test-endpoint', {}, {})


    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_DOMCENTRAL] [makeRequest] method', mockMethod)
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_DOMCENTRAL] [makeRequest] url', mockUrl)
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_DOMCENTRAL] [makeRequest] json', {})
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_DOMCENTRAL] [makeRequest] headers', {})
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_DOMCENTRAL] [makeRequest] error', mockError.message)

    expect(result).toBeUndefined()
  })
})
