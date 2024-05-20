const MIME_DECODERS = new Map([
  // when they don't return a content-type header, it could be anything (usually a body-less HTTP 201)
  ['unknown', () => ({ customMessage: 'All good in the hood!' })],
  ['application/json', _ => JSON.parse(_)],
  ['text/html', _ => ({ customMessage: _ || 'SumUp Goodtill returned HTML. This is very bad.' })],
  ['text/html; charset=utf-8', _ => ({ customMessage: _ || 'SumUp Goodtill returned HTML. This is very bad.' })]
])

module.exports = async function makeRequest(customHeaders = {}, method, url, json) {
  global.rdic.logger.log({}, '[CONNECTION_SUMUP] [makeRequest] 1', { customHeaders, method, url, json })

  const headers = {
    ...customHeaders,
    'content-type': 'application/json'
  }

  const response = await fetch(
    url,
    {
      method,
      headers,
      body: JSON.stringify(json)
    }
  )
  const contentType = response.headers.get('content-type') || 'unknown'
  const finalToReturn = MIME_DECODERS.get(contentType)(await response.text())
  global.rdic.logger.log({}, '[CONNECTION_SUMUP] [makeRequest] 2', { wasOk: response.ok, status: response.status, finalToReturn })
  if (!response.ok) {
    throw new Error(JSON.stringify(finalToReturn, null, 2))
  }

  return finalToReturn
}
