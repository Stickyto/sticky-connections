const logIn = require('./logIn')
const getConfiguration = require('../getConfiguration')

it('logs in with valid configuration', async () => {
  const r = await logIn(getConfiguration())
  expect(r.length).toBe(36)
})
