const Connection = require('../Connection')
const logIn = require('./logIn/logIn')
const getBooking = require('./methods/getBooking/getBooking')
const makePayment = require('./methods/makePayment/makePayment')

module.exports = new Connection({
  id: 'CONNECTION_GUESTLINE',
  name: 'Guestline',
  color: '#1f1c4d',
  logo: cdn => `${cdn}/connections/CONNECTION_GUESTLINE.svg`,
  configNames: ['Site ID', 'Interface ID', 'Operator code', 'Password'],
  configDefaults: ['', '808', 'STICKY', ''],
  methods: {
    getBooking: {
      name: 'Get a booking',
      logic: async ({ config, body }) => {
        const sessionId = await logIn(config)
        return getBooking(sessionId, body)
      }
    },
    makePayment: {
      name: 'Make a payment',
      logic: async ({ config, body }) => {
        const sessionId = await logIn(config)
        return makePayment(sessionId, body)
      }
    }
  }
})
