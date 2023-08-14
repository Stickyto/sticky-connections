const makeRequest = require('./makeRequest')

global.fetch = jest.fn()
const mockLogger = { log: jest.fn() }

describe('makeRequest', () => {
  beforeEach(() => {
    global.rdic = {
      logger: mockLogger
    }
    jest.resetAllMocks()
  })

  it('should handle JSON response', async () => {
    const responseBody = { key: 'value' }
    fetch.mockResolvedValueOnce({
      json: async () => responseBody,
      headers: {
        get: () => 'application/json'
      },
      status: 200
    })

    const result = await makeRequest('testToken', 'GET', 'testUrl', { some: 'data' })

    expect(result).toEqual({ key: 'value' })
    expect(mockLogger.log).toHaveBeenCalledTimes(6)
  })

  it('should handle HTML response', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => '<html></html>',
      headers: {
        get: () => 'text/html'
      },
      status: 200
    })

    const result = await makeRequest('testToken', 'GET', 'testUrl', { some: 'data' })

    expect(result).toEqual({ ourMessage: 'Deliverect returned HTML. This is very bad.' })
  })

  it('should handle unknown content type', async () => {
    const responseBody = 'random string'
    fetch.mockResolvedValueOnce({
      json: async () => responseBody,
      headers: {
        get: () => undefined
      },
      status: 200
    })

    const result = await makeRequest('testToken', 'GET', 'testUrl', { some: 'data' })

    expect(result).toEqual('random string')
  })
})
