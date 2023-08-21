const makeRequest = require('./makeRequest')

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
    const mockUrl = 'https://example.com/api'
    const mockJson = { data: 'test' }
    const mockResponse = { success: true }

    fetch.mockResolvedValue({ json: jest.fn().mockResolvedValue(mockResponse), ok: true })

    const result = await makeRequest(mockApiKey, mockMethod, mockUrl, mockJson)

    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PASSKIT] [makeRequest] 1', { apiKey: mockApiKey, method: mockMethod, url: mockUrl, json: mockJson })

    expect(fetch).toHaveBeenCalledWith(mockUrl, {
      method: mockMethod,
      // eslint-disable-next-line no-useless-escape
      body: '{\"data\":\"test\"}',
      headers: {
        'authorization': `Bearer ${mockApiKey}`
      }
    })

    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_PASSKIT] [makeRequest] 2', { asJson: mockResponse })

    expect(result).toEqual(mockResponse)
  })
})
