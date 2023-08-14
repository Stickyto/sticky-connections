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

    fetch.mockResolvedValue({ json: jest.fn().mockResolvedValue(mockResponse) })

    const result = await makeRequest(mockMethod, mockUrl, mockJson)

    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_CYCLR] [makeRequest] method', { method: mockMethod })
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_CYCLR] [makeRequest] url', { url: mockUrl })
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_CYCLR] [makeRequest] json/mimeType', { json: mockJson })

    expect(result).toEqual(mockResponse)
  })

  it('sends the correct body content to the fetch function', async () => {
    const mockMethod = 'GET'
    const mockUrl = 'https://test-url.com'
    const mockJson = { data: 'test' }

    fetch.mockResolvedValue({ json: jest.fn().mockResolvedValue({}) })

    await makeRequest(mockMethod, mockUrl, mockJson)

    expect(fetch).toHaveBeenCalledWith(mockUrl, {
      method: mockMethod,
      body: JSON.stringify(mockJson)
    })
  })

  it('returns the body if the response is a valid JSON', async () => {
    const mockResponseBody = { result: 'success' }

    fetch.mockResolvedValue({ json: jest.fn().mockResolvedValue(mockResponseBody) })

    const result = await makeRequest('GET', 'https://test-url.com', { data: 'test' })

    expect(result).toEqual(mockResponseBody)
  })

  it('returns undefined if the response cannot be parsed as JSON', async () => {
    fetch.mockResolvedValue({
      json: jest.fn().mockRejectedValue(new Error('invalid json'))
    })

    const result = await makeRequest('GET', 'https://test-url.com', { data: 'test' })

    expect(result).toBeUndefined()
  })
})