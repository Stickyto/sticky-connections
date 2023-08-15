const makeRequest = require('./makeRequest')
const parseResponse = require('./parseResponse/parseResponse')
jest.mock('./parseResponse/parseResponse')

describe('makeRequest', () => {
  global.fetch = jest.fn()

  beforeEach(() => {
    fetch.mockClear()
    global.rdic = {
      logger: {
        log: jest.fn(),
      },
    }
  })

  test('successful request', async () => {
    const requestXmlBody = '<xml></xml>'
    const config = ['clientId', 'clientSecret', 'scope', 'oAuthUrl', 'XMLUrl']
    const codeUnit = 'codeUnit'

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          '<?xml version="1.0"?><response><return_value>some xml content</return_value></response>',
      })

    parseResponse.mockImplementationOnce(() => '<response><return_value>some xml content</return_value></response>')

    const result = await makeRequest(requestXmlBody, config, codeUnit)

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(global.rdic.logger.log).toHaveBeenCalledTimes(3)
    expect(parseResponse).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      response: {
        return_value: 'some xml content',
      },
    })
  })

  test('failed request', async () => {
    const requestXmlBody = '<xml></xml>'
    const config = ['clientId', 'clientSecret', 'scope', 'oAuthUrl', 'XMLUrl']
    const codeUnit = 'codeUnit'

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'token123' }),
    })
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'some error message',
    })

    parseResponse.mockImplementationOnce(() => 'some error message')

    await expect(makeRequest(requestXmlBody, config, codeUnit)).rejects.toThrow(
      'some error message'
    )
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(global.rdic.logger.log).toHaveBeenCalledTimes(2)
  })

  test('failed request - no body', async () => {
    const requestXmlBody = '<xml></xml>'
    const config = ['clientId', 'clientSecret', 'scope', 'oAuthUrl', 'XMLUrl']
    const codeUnit = 'codeUnit'

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'token123' })
    })
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404
    })

    parseResponse.mockImplementationOnce(() => 'some error message')

    await expect(makeRequest(requestXmlBody, config, codeUnit)).rejects.toThrow(
      'HTTP 404.'
    )
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(global.rdic.logger.log).toHaveBeenCalledTimes(2)
  })
})
