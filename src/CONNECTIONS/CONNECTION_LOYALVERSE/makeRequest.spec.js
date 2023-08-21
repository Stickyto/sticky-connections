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
      json: jest.fn().mockResolvedValueOnce(mockResponse),
      ok: true
    })

    const result = await makeRequest([mockApiKey], mockUrl)

    expect(fetch).toHaveBeenCalledWith(`https://api.loyverse.com${mockUrl}`,
      {
        headers: {
          'authorization': `Bearer ${mockApiKey}`
        }
      }
    )

    expect(global.rdic.logger.log).toHaveBeenCalledWith({}, '[CONNECTION_LOYALVERSE] [makeRequest]', { asJson: mockResponse })
    expect(result).toEqual(mockResponse)
  })

  it('should throw an error', async () => {
    const mockApiKey = 'testApiKey'
    const mockUrl = '/test-endpoint'

    fetch.mockResolvedValue({
      text: () => 'Invalid JSON'
    })

    await expect(makeRequest([mockApiKey], mockUrl)).rejects.toThrow('Invalid JSON')
  })
})
