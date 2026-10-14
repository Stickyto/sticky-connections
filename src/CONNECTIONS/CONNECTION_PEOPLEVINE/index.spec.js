const connection = require('./index')

const config = ['https://api.peoplevine.dev/', 'api@example.com', 'test-password', '39']
const sessionId = 'a0480c28-e11b-4fb6-83ce-0b8733851417'
const body = { sessionId, number: '12749', name: 'patrick' }
const member = { id: 93140, card_id: '12749', status: 'active', customer: { first_name: 'Patrick' } }
const originalFetch = global.fetch
let connectionContainer, session, userSector, updateOne

beforeEach(() => {
  global.fetch = jest.fn()
  userSector = { writeTo: jest.fn() }
  session = {
    id: sessionId,
    userSectors: { readFrom: jest.fn().mockReturnValue(userSector) },
    toDatalayerRelational: jest.fn().mockReturnValue({ user_sectors: 'serialized sectors' })
  }
  updateOne = jest.fn().mockResolvedValue(undefined)
  connectionContainer = {
    user: { id: 'user-id' },
    rdic: { dlGetSession: jest.fn().mockResolvedValue(session), get: jest.fn().mockReturnValue({ updateOne }) }
  }
})

afterEach(() => {
  global.fetch = originalFetch
})

function respond (value) {
  fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => value })
}

test('tries the entered number as a member ID first without query parameters', async () => {
  respond({ access_token: 'test-token' })
  respond(member)
  await expect(connection.methods.verify.logic({ connectionContainer, config, body: { sessionId, number: '93140', name: ' Patrick ' } }))
    .resolves.toEqual({ number: '12749', name: 'Patrick' })
  expect(fetch).toHaveBeenNthCalledWith(2, 'https://api.peoplevine.dev/api/memberships/members/93140', {
    method: 'GET',
    headers: { Region: 'eu', 'content-type': 'application/json', authorization: 'Bearer test-token' }
  })
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(userSector.writeTo).toHaveBeenCalledWith('ID', '93140')
  expect(session.toDatalayerRelational).toHaveBeenCalledWith(['userSectors'])
  expect(updateOne).toHaveBeenCalledWith('sessions', sessionId, { user_sectors: 'serialized sectors' })
})

test.each([
  null,
  { ...member, id: 12749, customer: { first_name: 'Darren' } }
])('falls back when the direct result does not match: %j', async directMember => {
  respond({ access_token: 'test-token' })
  respond(directMember)
  respond([member])
  await expect(connection.methods.verify.logic({ connectionContainer, config, body }))
    .resolves.toEqual({ number: '12749', name: 'Patrick' })
  expect(fetch).toHaveBeenCalledTimes(3)
  expect(userSector.writeTo).toHaveBeenCalledWith('ID', '12749')
  expect(updateOne).toHaveBeenCalledWith('sessions', sessionId, { user_sectors: 'serialized sectors' })
})

test('falls back when the direct endpoint rejects the number', async () => {
  respond({ access_token: 'test-token' })
  fetch.mockResolvedValueOnce({ ok: false, status: 400 })
  respond([member])
  await expect(connection.methods.verify.logic({ connectionContainer, config, body }))
    .resolves.toEqual({ number: '12749', name: 'Patrick' })
})

test.each([401, 403, 429, 500])('tries the card lookup after a non-200 direct response (%s)', async status => {
  respond({ access_token: 'test-token' })
  fetch.mockResolvedValueOnce({ ok: false, status })
  respond([member])
  await expect(connection.methods.verify.logic({ connectionContainer, config, body })).resolves.toEqual({ number: '12749', name: 'Patrick' })
  expect(fetch).toHaveBeenCalledTimes(3)
})

test('authenticates for the configured company and verifies the member number and first name', async () => {
  respond({ access_token: 'test-token', user: { first_name: 'API user' } })
  fetch.mockResolvedValueOnce({ ok: false, status: 404 })
  respond([member])
  await expect(connection.methods.verify.logic({ connectionContainer, config, body: { sessionId, number: 12749, name: ' PATRICK ' } }))
    .resolves.toEqual({ number: '12749', name: 'Patrick' })
  expect(fetch).toHaveBeenNthCalledWith(1, 'https://api.peoplevine.dev/api/token', {
    method: 'POST',
    headers: { Region: 'eu', 'content-type': 'application/json' },
    body: JSON.stringify({ grant_type: 'password', username: config[1], password: config[2], company_id: 39 })
  })
  expect(fetch).toHaveBeenNthCalledWith(3, 'https://api.peoplevine.dev/api/memberships/members?Card_Id=12749&Status=active', {
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
  fetch.mockResolvedValueOnce({ ok: false, status: 404 })
  respond(members)
  await expect(connection.methods.verify.logic({ connectionContainer, config, body })).rejects.toThrow("Membership number 12749 isn't right")
  expect(updateOne).not.toHaveBeenCalled()
})

test('rejects missing input before contacting PeopleVine', async () => {
  await expect(connection.methods.verify.logic({ connectionContainer, config, body: { sessionId } })).rejects.toThrow('Membership number')
  expect(fetch).not.toHaveBeenCalled()
})

test('requires configuration', async () => {
  await expect(connection.methods.verify.logic({ connectionContainer, body })).rejects.toThrow('Please configure')
  expect(fetch).not.toHaveBeenCalled()
})

test('does not expose the upstream error body', async () => {
  fetch.mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'sensitive upstream response' })
  await expect(connection.methods.verify.logic({ connectionContainer, config, body })).rejects.toThrow('PeopleVine authentication failed (401).')
  expect(fetch).toHaveBeenCalledTimes(1)
})

test('requires an access token before looking up members', async () => {
  respond({ user: { first_name: 'API user' } })
  await expect(connection.methods.verify.logic({ connectionContainer, config, body })).rejects.toThrow('did not resolve an access token')
  expect(fetch).toHaveBeenCalledTimes(1)
})

test('reports invalid membership responses', async () => {
  respond({ access_token: 'test-token' })
  fetch.mockResolvedValueOnce({ ok: false, status: 404 })
  respond({ unexpected: true })
  await expect(connection.methods.verify.logic({ connectionContainer, config, body })).rejects.toThrow('invalid membership response')
})

test('does not report success when saving the session fails', async () => {
  respond({ access_token: 'test-token' })
  respond(member)
  updateOne.mockRejectedValue(new Error('Database unavailable'))
  await expect(connection.methods.verify.logic({ connectionContainer, config, body }))
    .rejects.toThrow('Database unavailable')
})
