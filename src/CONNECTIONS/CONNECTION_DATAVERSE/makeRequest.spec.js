const makeRequest = require('./makeRequest')

it.skip('works', async () => {
  const r = await makeRequest(
    [
      'https://xyz1-test.api.crm11.dynamics.com',
      'https://login.microsoftonline.com/xyz2/oauth2/token',
      'xyz3',
      'xyz4',
      '9.2'
    ],
    'get',
    'WhoAmI'
  )
  expect(r.UserId).toBe('xyz5')
})
