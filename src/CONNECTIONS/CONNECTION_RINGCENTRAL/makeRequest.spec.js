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

  it('should log request details and process a JSON string response', async () => {
    const mockMethod = 'get'
    const mockURL = 'https://example.com/api'
    const mockJSON = { data: 'test' }
    const mockBody = { success: true }

    fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockBody)
    })

    const result = await makeRequest(mockMethod, mockURL, mockJSON)

    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_RINGCENTRAL] [makeRequest]', { method: mockMethod, url: mockURL, json: mockJSON })
    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_RINGCENTRAL] [makeRequest] body', mockBody)
    expect(result).toEqual({ success: true })
  })

  it('should handle non-JSON responses', async () => {
    const mockMethod = 'get'
    const mockURL = 'https://example.com/api'
    const mockJSON = { data: 'test' }

    fetch.mockResolvedValue({
      json: jest.fn().mockRejectedValue()
    })

    const result = await makeRequest(mockMethod, mockURL, mockJSON)

    expect(result).toBeUndefined()
  })
})
