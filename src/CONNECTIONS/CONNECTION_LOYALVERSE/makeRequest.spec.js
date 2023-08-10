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

  it('should make a request with the correct URL and headers', async () => {
    const mockApiKey = 'testApiKey'
    const mockUrl = '/test-endpoint'
    const mockResponse = { key: 'value' }

    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValueOnce(mockResponse)
    })

    const result = await makeRequest([mockApiKey], mockUrl)

    expect(fetch).toHaveBeenCalledWith(`https://api.loyverse.com${mockUrl}`,
      {
        headers: {
          'Authorization': `Bearer ${mockApiKey}`
        }
      }
    )

    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_LOYALVERSE] [makeRequest] body', mockResponse)
    expect(result).toEqual(mockResponse)
  })

  it('should throw an error if the response is not valid JSON', async () => {
    const mockApiKey = 'testApiKey'
    const mockUrl = '/test-endpoint'
    const mockError = 'not valid JSON'

    fetch.mockResolvedValueOnce({
      json: jest.fn().mockRejectedValue(mockError)
    })

    const result = await makeRequest([mockApiKey], mockUrl)

    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_LOYALVERSE] [makeRequest] error', mockError)

    expect(result).toBeUndefined()
  })
})