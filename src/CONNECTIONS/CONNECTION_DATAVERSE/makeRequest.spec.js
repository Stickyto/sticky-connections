const makeRequest = require('./makeRequest')
const { AuthenticationContext } = require('adal-node')

jest.mock('adal-node')
global.fetch = jest.fn()

describe('makeRequest', () => {

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('successfully makes a request', async () => {
    const mockConfig = [
      'configInstance',
      'configTokenUrl',
      'configClientId',
      'configClientSecret',
      'configVersion'
    ]
    fetch.mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ success: true })
    })

    const mockAcquireTokenWithClientCredentials = jest.fn((_, __, ___, cb) => cb(null, { accessToken: 'testToken' }))
    AuthenticationContext.mockImplementation(() => ({
      acquireTokenWithClientCredentials: mockAcquireTokenWithClientCredentials
    }))

    const result = await makeRequest(mockConfig, 'GET', 'testUrl', { some: 'data' })
    expect(result).toEqual({ success: true })

    expect(global.fetch).toHaveBeenCalledWith('configInstance/api/data/vconfigVersion/testUrl', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer testToken'
      },
      body: JSON.stringify({ some: 'data' })
    })
  })

  it('throws error when AuthenticationContext fails', async () => {
    const mockConfig = [
      'configInstance',
      'configTokenUrl',
      'configClientId',
      'configClientSecret',
      'configVersion'
    ]

    const mockError = new Error('Token Error')
    const mockAcquireTokenWithClientCredentials = jest.fn((_, __, ___, cb) => cb(mockError, null))
    AuthenticationContext.mockImplementation(() => ({
      acquireTokenWithClientCredentials: mockAcquireTokenWithClientCredentials
    }))

    await expect(makeRequest(mockConfig, 'GET', 'testUrl', { some: 'data' }))
      .rejects.toThrow('Token Error')
  })

  it('returns undefined when response cannot be parsed to JSON', async () => {
    const mockConfig = [
      'configInstance',
      'configTokenUrl',
      'configClientId',
      'configClientSecret',
      'configVersion'
    ]
    fetch.mockResolvedValue({
      json: jest.fn().mockRejectedValue('invalid json')
    })

    const mockAcquireTokenWithClientCredentials = jest.fn((_, __, ___, cb) => cb(null, { accessToken: 'testToken' }))
    AuthenticationContext.mockImplementation(() => ({
      acquireTokenWithClientCredentials: mockAcquireTokenWithClientCredentials
    }))

    const result = await makeRequest(mockConfig, 'GET', 'testUrl', { some: 'data' })
    expect(result).toBeUndefined()
  })
})
