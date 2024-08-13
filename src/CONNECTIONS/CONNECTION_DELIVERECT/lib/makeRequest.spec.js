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
    fetch.mockResolvedValueOnce({
      text: async () => JSON.stringify({ key: 'value' }),
      headers: {
        get: () => 'application/json'
      },
      ok: true
    })

    const result = await makeRequest('testToken', 'GET', 'testUrl', { some: 'data' })

    expect(result).toEqual({ key: 'value' })
    expect(mockLogger.log).toHaveBeenCalledTimes(2)
  })

  it('should handle HTML response', async () => {
    fetch.mockResolvedValueOnce({
      text: async () => '<html></html>',
      headers: {
        get: () => 'text/html'
      },
      ok: true
    })

    const result = await makeRequest('testToken', 'GET', 'testUrl', { some: 'data' })

    expect(result).toEqual({ customMessage: '<html></html>' })
  })

  it('should handle unknown content type', async () => {
    fetch.mockResolvedValueOnce({
      text: async () => 'random string',
      headers: {
        get: () => undefined
      },
      ok: true
    })

    const result = await makeRequest('testToken', 'GET', 'testUrl', { some: 'data' })

    expect(result).toMatchObject({ customMessage: 'Success!' })
  })
})
