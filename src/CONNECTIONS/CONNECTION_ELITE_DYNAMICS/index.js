const { decode: readBorkedXml } = require('html-entities')
const parser = require('xml2json')
const ntlm = require('./ntlm')

const dateStringToUtc = require('./dateStringToUtc/dateStringToUtc')
const timeStringToSeconds = require('./timeStringToSeconds/timeStringToSeconds')
const Connection = require('../Connection')

function getBody(codeUnit, method, body = {}) {
  const bodyAttributes = Object.keys(body)
    .map(bk => `${bk}="${body[bk]}"`)
    .join(' ')
  return `<?xml version="1.0" encoding="utf-8"?>
  <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Header />
    <soap:Body>
      <${method} xmlns="urn:microsoft-dynamics-schemas/codeunit/${codeUnit}">
        <request>
          <xmldata>
            <![CDATA[<${method}${bodyAttributes.length > 0 ? ` ${bodyAttributes}` : ''}></${method}>]]>
          </xmldata>
        </request>
      </${method}>
    </soap:Body>
  </soap:Envelope>`
}

module.exports = new Connection({
  id: 'CONNECTION_ELITE_DYNAMICS',
  name: 'EliteParks',
  partnerNames: ['Elite Dynamics'],
  color: '#0D9277',
  logo: cdn => `${cdn}/connections/CONNECTION_ELITE_DYNAMICS.svg`,
  configNames: ['Client ID', 'Client Secret', 'Scope'],
  configDefaults: ['', '', 'https://api.businesscentral.dynamics.com/.default'],
  methods: {
    bookingAuthenticate: {
      name: 'Booking > Authenticate',
      logic: async ({ config }) => {
        const [configUsername, configPassword, configUrl] = config
        const body = getBody('BookingAPI', 'GetSetup', {})
        const outerResponse = await ntlm(configUrl, body, configUsername, configPassword)
        const innerResponse = readBorkedXml(outerResponse)
        const asJson = parser.toJson(innerResponse)
        return JSON.parse(asJson).GetSetup
      }
    },
    bookingCreate: {
      name: 'Booking > Create',
      logic: async ({ config }) => {
        const [configUsername, configPassword, configUrl] = config
        const body = getBody('BookingAPI', 'CreateBooking', {})
        const outerResponse = await ntlm(configUrl, body, configUsername, configPassword)
        const innerResponse = readBorkedXml(outerResponse)
        const asJsonString = parser.toJson(innerResponse)
        const asJsonObject = JSON.parse(asJsonString)
        const { booking_no: id } = asJsonObject.CreateBooking
        return {
          id
        }
      }
    },
    bookingUpdate: {
      name: 'Booking > Update',
      logic: async ({ config, body }) => {
        const [configUsername, configPassword, configUrl] = config
        const reqBody = getBody('BookingAPI', 'UpdateNotes', { 'booking_no': body.bookingId, notes: body.text })
        await ntlm(configUrl, reqBody, configUsername, configPassword)
        return {}
      }
    },
    bookingGet: {
      name: 'Booking > Get',
      logic: async ({ connectionContainer, config, body }) => {
        const { user } = connectionContainer
        const [configUsername, configPassword, configUrl] = config
        const reqBody = getBody('BookingAPI', 'GetBooking', { 'booking_no': body.bookingId })
        const outerResponse = await ntlm(configUrl, reqBody, configUsername, configPassword)
        const innerResponse = readBorkedXml(outerResponse)
        const asJsonString = parser.toJson(innerResponse)
        const asJsonObject = JSON.parse(asJsonString).GetBooking
        let {
          booking_no: id,
          no_of_adults: countAdults,
          no_of_children: countChildren,
          notes,
          // total_price,
          // amount_paid,
          outstanding_amount: total
        } = asJsonObject
        // total_price = Math.trunc(parseFloat(total_price) * 100)
        // amount_paid = Math.trunc(parseFloat(amount_paid) * 100)
        total = Math.trunc(parseFloat(total) * 100)
        countAdults = parseInt(countAdults, 10)
        countChildren = parseInt(countChildren, 10)
        return {
          id,
          dates: {
            create: dateStringToUtc(asJsonObject.added_date),
            // start: dateStringToUtc(asJsonObject.arrival_date),
            // end: dateStringToUtc(asJsonObject.departure_date),
            start: 1644192000 || dateStringToUtc(asJsonObject.arrival_date),
            end: 1644537600 || dateStringToUtc(asJsonObject.departure_date)
          },
          times: {
            checkIn: dateStringToUtc(asJsonObject.arrival_date) + timeStringToSeconds(asJsonObject.check_in_time) - user.timezone,
            checkOut: dateStringToUtc(asJsonObject.departure_date) + timeStringToSeconds(asJsonObject.check_out_time) - user.timezone
          },
          properties: {
            checkedIn: asJsonObject.arrived !== 'false',
            checkedOut: true || asJsonObject.departed !== 'false',
            cancelled: asJsonObject.cancelled !== 'false'
          },
          permissions: {
            checkIn: asJsonObject.can_check_in !== 'false',
            checkOut: asJsonObject.can_check_out !== 'false'
          },
          crossUserSector: {
            name: [asJsonObject.first_name, asJsonObject.middle_name, asJsonObject.surname]
              .filter(e => e)
              .join(' ') || undefined,
            email: asJsonObject.email || undefined,
            phone: asJsonObject.contact_no || asJsonObject.mobile_phone_no || asJsonObject.phone_no || undefined,
          },
          metadata: {
            firstName: asJsonObject.first_name || undefined
          },
          counts: {
            people: {
              adults: countAdults,
              children: countChildren
            }
          },
          notes,
          total
        }
      }
    },
    bookingCheckIn: {
      name: 'Booking > Check in',
      logic: async ({ config, body }) => {
        const [configUsername, configPassword, configUrl] = config
        const reqBody = getBody('BookingAPI', 'CheckInBooking', { 'booking_no': body.bookingId })
        await ntlm(configUrl, reqBody, configUsername, configPassword)
        return {}
      }
    },
    bookingCheckOut: {
      name: 'Booking > Check out',
      logic: async ({ config, body }) => {
        const [configUsername, configPassword, configUrl] = config
        const reqBody = getBody('BookingAPI', 'CheckOutBooking', { 'booking_no': body.bookingId })
        await ntlm(configUrl, reqBody, configUsername, configPassword)
        return {}
      }
    },
    bookingPayStart: {
      name: 'Booking > Pay start',
      logic: async ({ config, body }) => {
        const [configUsername, configPassword, configUrl] = config
        const reqBody = getBody('BookingAPI', 'TagBooking', { 'booking_no': body.bookingId })
        await ntlm(configUrl, reqBody, configUsername, configPassword)
        return {}
      }
    },
    bookingPayGood: {
      name: 'Booking > Pay good',
      logic: async ({ config, body }) => {
        const [configUsername, configPassword, configUrl] = config
        const reqBody1 = getBody('BookingAPI', 'MakePayment', { 'booking_no': body.bookingId, reference: body.paymentId.substring(0, 30), amount: (body.total / 100).toFixed(2) })
        const outerResponse = await ntlm(configUrl, reqBody1, configUsername, configPassword)
        const innerResponse = readBorkedXml(outerResponse)
        const asJsonString = parser.toJson(innerResponse)
        const asJsonObject = JSON.parse(asJsonString)
        let { receipt_no: paymentGatewayId } = asJsonObject.MakePayment
        if (body.doConfirm) {
          const reqBody2 = getBody('BookingAPI', 'ConfirmBooking', { 'booking_no': body.bookingId })
          await ntlm(configUrl, reqBody2, configUsername, configPassword)
        }
        return {
          paymentGatewayId
        }
      }
    },
    bookingPayBad: {
      name: 'Booking > Pay bad',
      logic: async ({ config, body }) => {
        const [configUsername, configPassword, configUrl] = config
        const reqBody = getBody('BookingAPI', 'UntagBooking', { 'booking_no': body.bookingId })
        await ntlm(configUrl, reqBody, configUsername, configPassword)
        return {}
      }
    }
  }
})
