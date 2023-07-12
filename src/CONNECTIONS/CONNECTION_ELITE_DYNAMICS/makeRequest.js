const httpntlm = require('httpntlm')
const parseResponse = require('./parseResponse/parseResponse')

// step 1: oauth
// step 2: use native fetch / whatever we do to make a http request

function getFormHttpBody (params) {
  return Object.keys(params)
    .filter(key => typeof params[key] === 'string' || typeof params[key] === 'number')
    .map(key => {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
    }).join('&')
}

module.exports = async (body, config) => {
  const [clientId, clientSecret, scope] = config
  const payload = getFormHttpBody({
    clientId,
    clientSecret,
    scope
  })
  console.warn('xxx payload', payload)
  return {}
  // const response = await new Promise((resolve, reject) => {
  //   httpntlm.post(
  //     {
  //       url,
  //       username,
  //       password,
  //       body,
  //       headers: {
  //         'content-type': 'text/xml',
  //         'SOAPAction': 'GetSetup',
  //         'Bearer': 'result of auth'
  //       }
  //     },
  //     (e, res) => {
  //       e && reject(e)
  //       !e && resolve(res)
  //     }
  //   )
  // })

  // if (response.statusCode !== 200) {
  //   const rejection = response.body ? await parseResponse(response.body, '//faultstring/text()') : `HTTP ${response.statusCode}.`
  //   throw new Error(rejection)
  // }
  // const resolution = await parseResponse(response.body, '//*[local-name()=\'return_value\']/text()')
  // return resolution
}
