const getAllEventHooks = require('./getAllEventHooks')

it('returns an array of objects', () => {
  const r = getAllEventHooks()
  expect(r[0].connectionId).toBe('CONNECTION_CYCLR')
  expect(r[0].type).toBe('SESSION_READ')
})
