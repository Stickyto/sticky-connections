const getAll = require('./getAll')

it('returns an array of objects', () => {
  const r = getAll()
  expect(r[0].id).toBe('CONNECTION_CYCLR')
})
