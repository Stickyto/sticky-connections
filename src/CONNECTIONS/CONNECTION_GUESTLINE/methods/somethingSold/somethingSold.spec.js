const logIn = require('../../logIn/logIn')
const somethingSold = require('./somethingSold')
const getConfiguration = require('../../getConfiguration')

it('sells something', async () => {
  const remoteSessionId = await logIn(getConfiguration())
  const r = await somethingSold(
    remoteSessionId,
    {
      bookingReference: 'BK005801',
      roomIndex: 1,
      productCode: 'BISCUITS',
      total: 50,
      quantity: 5
    }
  )
  expect(r).toBe(true)
})
