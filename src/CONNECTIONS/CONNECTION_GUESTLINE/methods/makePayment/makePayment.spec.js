const logIn = require('../../logIn/logIn')
const makePayment = require('./makePayment')
const getConfiguration = require('../../getConfiguration')

it('makes a payment', async () => {
  const remoteSessionId = await logIn(getConfiguration())
  const r = await makePayment(
    remoteSessionId,
    {
      bookingReference: 'BK005801',
      userIdInThisBooking: 1,
      paymentCode: 'BACS',
      total: 123
    }
  )
  expect(r).toBe(true)
})
