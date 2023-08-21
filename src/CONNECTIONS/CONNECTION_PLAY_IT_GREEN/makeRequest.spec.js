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

  it('should handle a JSON response', async () => {
    const mockApiToken = 'token123'
    const mockMethod = 'get'
    const mockURL = 'https://example.com/api'
    const mockJSON = { data: 'test' }
    const mockMimeType = 'json'

    fetch.mockResolvedValue({ json: jest.fn().mockResolvedValue({ success: true }), ok: true })

    const result = await makeRequest(mockApiToken, mockMethod, mockURL, mockJSON, mockMimeType)

    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] 1', { apiToken: mockApiToken, method: mockMethod, url: mockURL })
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] 2 json/mimeType', { json: mockJSON, mimeType: mockMimeType })
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] 6 body', { success: true })
    expect(result).toEqual({ success: true })
  })

  it('should handle a text response', async () => {
    const mockApiToken = 'token123'
    const mockMethod = 'get'
    const mockURL = 'https://example.com/api'
    const mockJSON = null
    const mockMimeType = 'text'

    fetch.mockResolvedValue({ json: jest.fn().mockResolvedValue({ success: true }), ok: true })

    const result = await makeRequest(mockApiToken, mockMethod, mockURL, mockJSON, mockMimeType)

    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] 1', { apiToken: mockApiToken, method: mockMethod,  url: mockURL })
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] 2 json/mimeType', { json: mockJSON, mimeType: mockMimeType })

    // eslint-disable-next-line no-useless-escape
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] 6 body', '{\"success\":true}')

    // eslint-disable-next-line no-useless-escape
    expect(result).toEqual('{\"success\":true}')
  })

  it('should throw an error', async () => {
    const mockApiToken = 'token123'
    const mockMethod = 'get'
    const mockURL = 'https://example.com/api'
    const mockJSON = { data: 'test' }
    const mockMimeType = 'json'

    fetch.mockResolvedValue({
      text: () => 'Very bad'
    })
    await expect(makeRequest(mockApiToken, mockMethod, mockURL, mockJSON, mockMimeType)).rejects.toThrow('!response.ok: [https://example.com/api]: Very bad')
  })
})
