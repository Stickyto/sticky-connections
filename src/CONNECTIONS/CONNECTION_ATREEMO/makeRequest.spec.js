const configDefaults = JSON.parse(process.env.CONFIG_DEFAULTS)
const makeRequest = require('./makeRequest')

async function getToken() {
  const [, configUsername, configPassword] = configDefaults
  const {
    access_token: bearerToken
  } = await makeRequest(
    configDefaults,
    'post',
    'token',
    {
      grant_type: 'password',
      username: configUsername,
      password: configPassword
    },
    'application/x-www-form-urlencoded'
  )
  return bearerToken
}

it('works', async () => {
  const token = await getToken()
  const r = await makeRequest(
    configDefaults,
    'get',
    'api/Contact/Get/110428',
    undefined,
    undefined,
    token
  )
  expect(r.FirstName).toBe('Ultimate Test Contact')
})
