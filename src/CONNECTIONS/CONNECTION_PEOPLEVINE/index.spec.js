const connection = require('./index')

const config = ['https://api.peoplevine.dev/', 'api@example.com', 'test-password', '39']
const body = { number: '12749', name: 'patrick' }
const member = { card_id: '12749', status: 'active', customer: { first_name: 'Patrick' } }
const originalFetch = global.fetch

beforeEach(() => {
  global.fetch = jest.fn()
})

afterEach(() => {
  global.fetch = originalFetch
})

function respond (value) {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => value })
}

test('authenticates for the configured company and verifies the member number and first name', async () => {
  respond({ access_token: 'test-token', user: { first_name: 'API user' } })
  respond([member])
  await expect(connection.methods.verify.logic({ config, body: { number: 12749, name: ' PATRICK ' } }))
    .resolves.toEqual({ number: '12749', name: 'Patrick' })
  expect(fetch).toHaveBeenNthCalledWith(1, 'https://api.peoplevine.dev/api/token', {
    method: 'POST',
    headers: { Region: 'eu', 'content-type': 'application/json' },
    body: JSON.stringify({ grant_type: 'password', username: config[1], password: config[2], company_id: 39 })
  })
  expect(fetch).toHaveBeenNthCalledWith(2, 'https://api.peoplevine.dev/api/memberships/members?Card_Id=12749&Status=active', {
    method: 'GET',
    headers: { Region: 'eu', 'content-type': 'application/json', authorization: 'Bearer test-token' }
  })
})

test.each([
  [],
  [{ ...member, card_id: '22503' }],
  [{ ...member, status: 'expired' }],
  [{ ...member, customer: { first_name: 'Darren' } }],
  [{ ...member, customer: null }]
].map(members => [members]))('rejects an unknown or mismatched membership: %j', async members => {
  respond({ access_token: 'test-token' })
  respond(members)
  await expect(connection.methods.verify.logic({ config, body })).rejects.toThrow("Membership number 12749 isn't right")
})

test('rejects missing input before contacting PeopleVine', async () => {
  await expect(connection.methods.verify.logic({ config, body: {} })).rejects.toThrow('Membership number')
  expect(fetch).not.toHaveBeenCalled()
})

test('requires configuration', async () => {
  await expect(connection.methods.verify.logic({ body })).rejects.toThrow('Please configure')
  expect(fetch).not.toHaveBeenCalled()
})

test('does not expose the upstream error body', async () => {
  fetch.mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'sensitive upstream response' })
  await expect(connection.methods.verify.logic({ config, body })).rejects.toThrow('PeopleVine authentication failed (401).')
  expect(fetch).toHaveBeenCalledTimes(1)
})

test('requires an access token before looking up members', async () => {
  respond({ user: { first_name: 'API user' } })
  await expect(connection.methods.verify.logic({ config, body })).rejects.toThrow('did not return an access token')
  expect(fetch).toHaveBeenCalledTimes(1)
})

test('reports invalid membership responses', async () => {
  respond({ access_token: 'test-token' })
  respond({ unexpected: true })
  await expect(connection.methods.verify.logic({ config, body })).rejects.toThrow('invalid membership response')
})
