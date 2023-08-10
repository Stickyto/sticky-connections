const makeRequest = require('./makeRequest')

global.fetch = jest.fn()

describe('makeRequest', () => {
  const mockConfig = ['apiKey123', 'test@email.com']

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should send a request with the correct Authorization header', async () => {
    const url = 'test-endpoint'
    const expectedAuthHeader = 'Basic ' + Buffer.from(`${mockConfig[1]}:${mockConfig[0]}`).toString('base64')

    fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ success: true })
    })

    const result = await makeRequest(mockConfig, url)

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining(url), {
      headers: {
        'Authorization': expectedAuthHeader
      }
    })
    expect(result).toEqual({ success: true })
  })

  it('should throw an error for non-JSON response', async () => {
    const url = 'test-endpoint'

    fetch.mockResolvedValue({
      json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
    })

    await expect(makeRequest(mockConfig, url)).rejects.toThrow('Invalid JSON')
  })

  it('should handle server errors', async () => {
    const url = 'test-endpoint'

    fetch.mockRejectedValue(new Error('Internal Server Error'))

    await expect(makeRequest(mockConfig, url)).rejects.toThrow('Internal Server Error')
  })
})