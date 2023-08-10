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

    fetch.mockResolvedValue({ json: jest.fn().mockResolvedValue({ success: true }) })

    const result = await makeRequest(mockApiToken, mockMethod, mockURL, mockJSON, mockMimeType)

    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] apiToken', { apiToken: mockApiToken })
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] method', { method: mockMethod })
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] url', { url: mockURL })
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] json/mimeType', { json: mockJSON, mimeType: mockMimeType })
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] body', { success: true })
    expect(result).toEqual({ success: true })
  })

  it('should handle a text response', async () => {
    const mockApiToken = 'token123'
    const mockMethod = 'get'
    const mockURL = 'https://example.com/api'
    const mockJSON = null
    const mockMimeType = 'text'

    fetch.mockResolvedValue({ json: jest.fn().mockResolvedValue({ success: true }) })

    const result = await makeRequest(mockApiToken, mockMethod, mockURL, mockJSON, mockMimeType)

    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] apiToken', { apiToken: mockApiToken })
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] method', { method: mockMethod })
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] url', { url: mockURL })
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] json/mimeType', { json: mockJSON, mimeType: mockMimeType })

    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] typeof bodyAsString', 'string')
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] bodyAsString.length', 16)

    // eslint-disable-next-line no-useless-escape
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] body', '{\"success\":true}')

    // eslint-disable-next-line no-useless-escape
    expect(result).toEqual('{\"success\":true}')
  })


  it('should throw an error for an invalid response', async () => {
    const mockApiToken = 'token123'
    const mockMethod = 'get'
    const mockURL = 'https://example.com/api'
    const mockJSON = { data: 'test' }
    const mockMimeType = 'json'
    const mockError = 'Invalid JSON'

    fetch.mockResolvedValue({ json: jest.fn().mockRejectedValue(mockError) })

    const result = await makeRequest(mockApiToken, mockMethod, mockURL, mockJSON, mockMimeType)

    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] apiToken', { apiToken: mockApiToken })
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] method', { method: mockMethod })
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] url', { url: mockURL })
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] json/mimeType', { json: mockJSON, mimeType: mockMimeType })
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] error', mockError)

    expect(result).toBeUndefined()
  })
})