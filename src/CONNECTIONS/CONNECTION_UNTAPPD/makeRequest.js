module.exports = async function makeRequest(config, url) {
  const [apiKey, email] = config

  const response = await fetch(`https://business.untappd.com/api/${url}`,
    {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${email}:${apiKey}`).toString('base64')
      }
    })
  const body = await response.json()

  return body
}
