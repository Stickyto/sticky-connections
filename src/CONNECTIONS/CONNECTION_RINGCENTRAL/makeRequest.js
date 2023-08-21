module.exports = async function makeRequest(method, url, json) {
  global.rdic.logger.log({}, '[CONNECTION_RINGCENTRAL] [makeRequest]', { method, url, json })
  const response = await fetch(url,
    {
      json
    }
  )

  try {
    const body = await response.json()

    global.rdic.logger.log({}, '[CONNECTION_RINGCENTRAL] [makeRequest] body', body)

    return body
  } catch (e) {
    return undefined
  }
}
