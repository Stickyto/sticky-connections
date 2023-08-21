const makeRequest = require('./makeRequest')

global.rdic = {
  logger: {
    log: jest.fn()
  }
}

global.fetch = jest.fn()

describe('makeRequest', () => {
  afterEach(() => {
    fetch.mockReset()
  })

  it('logs the provided method, url, and json', async () => {
    const mockMethod = 'GET'
    const mockUrl = 'https://test-url.com'
    const mockJson = { data: 'test' }
    const mockResponse = { success: 'ok' }

    fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockResponse),
      ok: true
    })

    const result = await makeRequest(mockMethod, mockUrl, mockJson)

    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_CYCLR] [makeRequest]', { method: mockMethod, url: mockUrl, json: mockJson })

    expect(result).toEqual(mockResponse)
  })

  it('sends the correct body content to the fetch function', async () => {
    const mockMethod = 'GET'
    const mockUrl = 'https://test-url.com'
    const mockJson = { data: 'test' }

    fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({}),
      ok: true
    })

    await makeRequest(mockMethod, mockUrl, mockJson)

    expect(fetch).toHaveBeenCalledWith(mockUrl, {
      method: mockMethod,
      body: JSON.stringify(mockJson)
    })
  })

  it('returns the body if the response is valid JSON', async () => {
    const mockResponseBody = { result: 'success' }

    fetch.mockResolvedValue({ json: jest.fn().mockResolvedValue(mockResponseBody), ok: true })

    const result = await makeRequest('GET', 'https://test-url.com', { data: 'test' })

    expect(result).toEqual(mockResponseBody)
  })

  it('should throw an error', async () => {
    fetch.mockResolvedValue({
      text: () => 'Very bad'
    })
    await expect(makeRequest('GET', 'https://test-url.com', { data: 'test' })).rejects.toThrow('!response.ok: [https://test-url.com]: Very bad')
  })
})
