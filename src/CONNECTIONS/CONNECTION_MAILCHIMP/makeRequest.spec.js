const makeRequest = require('./makeRequest')

global.fetch = jest.fn()

const mockApiToken = 'testToken'
const mockMethod = 'GET'
const mockUrl = 'https://test.url'
const mockJson = { key: 'value' }

function mockFetchResponse(bodyContent) {
  global.fetch.mockResolvedValueOnce({
    json: () => Promise.resolve(bodyContent),
    ok: true
  })
}

describe('makeRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.rdic = {
      logger: {
        log: jest.fn()
      }
    }
  })

  it('should make a request using "fetch" with correct parameters', async () => {
    mockFetchResponse({ success: true })

    await makeRequest(mockApiToken, mockMethod, mockUrl, mockJson)

    expect(global.fetch).toHaveBeenCalledWith(mockUrl, {
      headers: {
        'Authorization': `Bearer ${mockApiToken}`,
        'Content-Type': 'application/json'
      },
      method: mockMethod,
      body: JSON.stringify(mockJson)
    })
  })

  it('should parse the JSON response', async () => {
    const expectedResponse = { success: true }
    mockFetchResponse(expectedResponse)
    console.log('Danesh, ', mockApiToken, mockMethod, mockUrl, mockJson)

    const result = await makeRequest(mockApiToken, mockMethod, mockUrl, mockJson)

    expect(result).toEqual(expectedResponse)
  })

  it('should return undefined when response is not a successful HTTP response', async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.reject(),
      ok: false
    })

    const result = await makeRequest(mockApiToken, mockMethod, mockUrl, mockJson)

    expect(result).toBeUndefined()
  })
})