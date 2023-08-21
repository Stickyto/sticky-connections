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
      json: jest.fn().mockResolvedValueOnce(mockResponse),
      ok: true
    })

    const result = await makeRequest(mockPrivateKey, mockMethod, mockUrl, mockJson)

    expect(fetch).toHaveBeenCalledWith(mockUrl, {
      method: mockMethod,
      headers: {
        'authorization': `Bearer ${mockPrivateKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(mockJson)
    })

    expect(result).toEqual({ success: true })
  })

  it('should make a request without authorization header if no privateKey provided', async () => {
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce({}),
      ok: true
    })

    await makeRequest(null, 'GET', 'https://api.example.com/test-endpoint', {})

    expect(fetch).toHaveBeenCalledWith('https://api.example.com/test-endpoint', expect.objectContaining({
      headers: {
        'content-type': 'application/json'
      },
      method: 'GET'
    }))
  })

  it('should throw an error', async () => {
    fetch.mockResolvedValue({
      text: () => 'Very bad'
    })
    await expect(makeRequest('testPrivateKey', 'GET', 'https://api.example.com/test-endpoint', {})).rejects.toThrow('!response.ok: [https://api.example.com/test-endpoint]: Very bad')
  })
})
