const makeRequest = require('./makeRequest')

global.fetch = jest.fn()

const mockApiToken = 'testToken'
const mockMethod = 'GET'
const mockUrl = 'https://test.url'
const mockJson = { key: 'value' }

function mockFetchResponse(bodyContent) {
  fetch.mockResolvedValueOnce({
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

    expect(fetch).toHaveBeenCalledWith(mockUrl, {
      headers: {
        'authorization': `Bearer ${mockApiToken}`,
        'content-type': 'application/json'
      },
      method: mockMethod,
      body: JSON.stringify(mockJson)
    })
  })

  it('should parse the JSON response', async () => {
    const expectedResponse = { success: true }
    mockFetchResponse(expectedResponse)

    const result = await makeRequest(mockApiToken, mockMethod, mockUrl, mockJson)

    expect(result).toEqual(expectedResponse)
  })

  it('should throw an error', async () => {
    fetch.mockResolvedValue({
      text: () => 'Very bad'
    })
    await expect(makeRequest(mockApiToken, mockMethod, mockUrl, mockJson)).rejects.toThrow('!response.ok: [https://test.url]: Very bad')
  })
})
