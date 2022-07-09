const getAllCrons = require('./getAllCrons')

it('returns an array of objects', () => {
  const r = getAllCrons()
  expect(r[0].connectionId).toBe('CONNECTION_LOYALVERSE')
  expect(typeof r[0].frequency).toBe('string')
})
