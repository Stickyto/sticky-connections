/* eslint-disable jest/no-conditional-expect */
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

    fetch.mockResolvedValueOnce({
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

  it('should make a request with headers if provided', async () => {
    const mockHeaders = { 'Authorization': 'Bearer xyz' }

    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({ authenticated: true })
    })

    await makeRequest('GET', 'https://api.example.com/test-endpoint', {}, mockHeaders)

    expect(fetch).toHaveBeenCalledWith('https://api.example.com/test-endpoint', expect.objectContaining({
      headers: mockHeaders
    }))
  })

  it('should log an error for an invalid JSON response', async () => {
    const mockMethod = 'GET'
    const mockUrl = 'https://api.example.com/test-endpoint'
    const mockError = { message: 'Invalid JSON' }

    fetch.mockResolvedValueOnce({
      json: jest.fn().mockRejectedValue(mockError)
    })

    try {
      await makeRequest(mockMethod, mockUrl, {}, {})
    } catch (e) {
      expect(e.message).toBe('Invalid JSON')
    } finally {
      expect(global.rdic.logger.log).toHaveBeenCalledTimes(1)
    }
  })
})
