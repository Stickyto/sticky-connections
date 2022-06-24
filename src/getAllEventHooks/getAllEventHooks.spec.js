const getAllEventHooks = require('./getAllEventHooks')

it('returns an array of objects', () => {
  const r = getAllEventHooks()
  expect(r[0].connectionId).toBe('CONNECTION_DATAVERSE')
  expect(r[0].type).toBe('LD_V2')
})
