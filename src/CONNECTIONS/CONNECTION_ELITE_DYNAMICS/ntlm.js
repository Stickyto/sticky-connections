const httpntlm = require('httpntlm')
const parseResponse = require('./parseResponse/parseResponse')

function asyncPost (url, body, username, password) {
  return new Promise((resolve, reject) => {
    httpntlm.post(
      {
        url,
        username,
        password,
        body,
        headers: {
          'content-type': 'text/xml',
          'SOAPAction': 'GetSetup'
        }
      },
      (e, res) => {
        e && reject(e)
        !e && resolve(res)
      }
    )
  })
}

module.exports = async (url, body, username, password) => {
  const response = await asyncPost(url, body, username, password)
  if (response.statusCode !== 200) {
    const rejection = response.body ? await parseResponse(response.body, '//faultstring/text()') : `HTTP ${response.statusCode}.`
    throw new Error(rejection)
  }
  const resolution = await parseResponse(response.body, '//*[local-name()=\'return_value\']/text()')
  return resolution
}
