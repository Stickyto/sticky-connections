const makeRequest = require('./makeRequest')

global.fetch = jest.fn()

afterEach(() => {
  jest.resetAllMocks()
})

it('should handle a JSON response', async () => {
  const mockMethod = 'put'
  const mockApiKeys = ['123', '456']
  const mockUrl = 'example.com'
  const mockJson = { status: 'completed' }

  fetch.mockResolvedValue({ json: jest.fn().mockResolvedValue({ 'abc': 'def' }), ok: true })

  const result = await makeRequest(mockMethod, mockUrl, mockApiKeys, mockJson)
  expect(result).toEqual({ 'abc': 'def' })
})
