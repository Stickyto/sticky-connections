const logIn = require('../../logIn/logIn')
const checkIn = require('./checkIn')
const getConfiguration = require('../../getConfiguration')

it('checks in', async () => {
  const remoteSessionId = await logIn(getConfiguration())
  const r = await checkIn(remoteSessionId, { bookingName: 'Bloggs', bookingReference: 'BK005804' })
  expect(r).toMatchObject({})
})
