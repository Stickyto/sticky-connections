/* eslint-disable max-len */
const { assert } = require('@stickyto/openbox-node-utils')
const makeRequest = require('./makeRequest')
const makeRequestV2 = require('./makeRequestV2')

const dateStringToUtc = require('./dateStringToUtc/dateStringToUtc')
const timeStringToSeconds = require('./timeStringToSeconds/timeStringToSeconds')
const Connection = require('../Connection')
const forceArray = require('./forceArray/forceArray')


async function eventHookLogic (config, connectionContainer) {
  const { event, payment, user, application, thing, session, createEvent } = connectionContainer
  const userSector = session ? session.userSectors.readFrom(user.id) : undefined
  const ownerId = userSector.readFrom('EliteParks owner')

  console.warn('[DebugLater] 1', { userSector, ownerId })

  const [, , , , , urlOwnerApi] = config
  let userPaymentId = ownerId ? {
    ownerId,
    basket: [{
      id: '',
      total: payment.total
    }]
  } : undefined
  try {
    console.warn('[DebugLater] 2')
    userPaymentId = JSON.parse(payment.userPaymentId)
    console.warn('[DebugLater] 3', { userPaymentId })
  } catch (_) {
  }
  console.warn('[DebugLater] 4', { userPaymentId })
  if (userPaymentId) {
    console.warn('[DebugLater] 5', { userPaymentId })
    const xmlBody = `<PayInvoice reference="${payment.id}" customer_no="${userPaymentId.ownerId}">${userPaymentId.basket.map(_ => `<Invoice amount="${(_.total / 100).toFixed(2)}" no="${_.id}" />`).join('')}</PayInvoice>`
    console.warn('[DebugLater] 6', { userPaymentId })
    try {
      const r = await makeRequest(
        urlOwnerApi,
        getBody(
          'OwnerAPI',
          'PayInvoice',
          undefined,
          xmlBody
        ),
        config
      )
      // { PayInvoice: { receipt_no: 'POS0315727' } }
    } catch ({ message }) {
      console.warn('[DebugLater] 7 catching', { userPaymentId })
      createEvent({
        type: 'CONNECTION_BAD',
        userId: user.id,
        customData: { id: 'CONNECTION_ELITE_DYNAMICS', message }
      })
    }
  }
}

function getBody(codeUnit, method, body = {}, xmlBody = '') {
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
            <![CDATA[${xmlBody ? xmlBody : `<${method}${bodyAttributes.length > 0 ? ` ${bodyAttributes}` : ''}></${method}>`}]]>
          </xmldata>
        </request>
      </${method}>
    </soap:Body>
  </soap:Envelope>`
}

module.exports = new Connection({
  id: 'CONNECTION_ELITE_DYNAMICS',
  name: 'Elite Dynamics',
  color: '#0D9277',
  logo: cdn => `${cdn}/connections/CONNECTION_ELITE_DYNAMICS.svg`,
  configNames: [
    'Client ID',
    'Client Secret',
    'Scope',
    'OAuth URL',
    'BookingAPI URL',
    'OwnerAPI URL'
  ],
  configDefaults: [
    '',
    '',
    'https://api.businesscentral.dynamics.com/.default',
    'https://login.microsoftonline.com/Customer-ID/oauth2/v2.0/token',
    'https://api.businesscentral.dynamics.com/v2.0/Customer-ID/Sandbox/WS/Customer-Name/Codeunit/BookingAPI',
    'https://api.businesscentral.dynamics.com/v2.0/Customer-ID/Sandbox/WS/Customer-Name/Codeunit/OwnerAPI'
  ],
  eventHooks: {
    'SESSION_CART_PAY': eventHookLogic
  },
  methods: {
    businessCentralApi: {
      name: 'Business Central',
      logic: async ({ connectionContainer, config, body }) => {
        const { url } = body
        assert(url && url.startsWith('https://api.businesscentral.dynamics.com/v2.0'), 'body->url must start with "https://api.businesscentral.dynamics.com/v2.0"!')
        assert(url.includes('?$filter=') && url.includes(' eq '), 'body->url does not have enough constraints.')
        const { value } = await makeRequest(
          url,
          undefined,
          config,
          'GET',
          'application/json'
        )
        return value
      }
    },
    setUp: {
      name: 'Set up',
      logic: async ({ connectionContainer, config, body }) => {
        const [, , , , urlBookingApi] = config
        const { GetSetup: { Park, BookingAttribute, BookingSeasonDatePeriod } } = await makeRequestV2(urlBookingApi, getBody('BookingAPI', 'GetSetup'), config)
        return {
          parks: Park.map(_ => ({
            id: _.code,
            name: _.name,
            canBookPlot: _.available_for_plot_booking === 'true',
            canBookUnit: _.available_for_unit_booking === 'true',
            // _datePeriods: BookingSeasonDatePeriod.filter(bsdp => bsdp.park_code === _.code).map(bsdp => ({ type: bsdp.booking_type, dateStart: dateStringToUtc(bsdp.start_date), dateEnd: dateStringToUtc(bsdp.end_date), nights: parseInt(bsdp.no_of_nights, 10) }))
          })),
          attributes: BookingAttribute.map(_ => ({
            index: _.index,
            id: _.code,
            name: _.caption
          }))
        }
      }
    },
    ownerAuthenticate: {
      name: 'Owner > Authenticate',
      logic: async ({ connectionContainer, config, body }) => {
        const [, clientSecret, , , , urlOwnerApi] = config
        let { ownerId = '', ownerEmail = '', clientSecret: bodyClientSecret } = body
        const knowsSomethingSecret = clientSecret === bodyClientSecret
        ownerId = ownerId.trim().toUpperCase()
        ownerEmail = ownerEmail.trim().toLowerCase()
        const { GetOwner: ownerJson } = await makeRequest(urlOwnerApi, getBody('OwnerAPI', 'GetOwner', { 'customer_no': ownerId }), config)
        // !knowsSomethingSecret && ownerJson.email && assert(ownerJson.email.toLowerCase() === ownerEmail, `We found someone with ID ${ownerId} but the email wasn't ${ownerEmail || '?'}.`)

        let dealJson
        try {
          ({ GetDeal: dealJson } = await makeRequest(urlOwnerApi, getBody('OwnerAPI', 'GetDeal', { 'deal_no': ownerJson.current_deal_no }), config, 'OwnerAPI'))
        } catch (e) {
          throw new Error(`We found ${ownerId} but you don't have a current deal.`)
        }

        return {
          id: ownerJson.customer_no,
          dealId: ownerJson.current_deal_no,
          email: ownerJson.email,
          parkId: dealJson.park_code,
          plotId: dealJson.plot_no,
          unitId: dealJson.unit_no
        }
      }
    },
    invoicesGet: {
      name: 'Invoices > Get',
      logic: async ({ connectionContainer, config, body }) => {
        const [, , , , , urlOwnerApi] = config
        let { ownerId = '' } = body
        ownerId = ownerId.trim().toUpperCase()
        const { GetCustomerLedgerEntries: response } = await makeRequest(urlOwnerApi, getBody('OwnerAPI', 'GetCustomerLedgerEntries', { 'customer_no': ownerId, 'open': false, 'document_type': 'Invoice' }), config)

        const {
          customer_balance: balance,
          CustomerLedgerEntry: customerLedgerEntries
        } = response

        const invoices = forceArray(customerLedgerEntries).map(invoice => {
          const {
            document_no: documentNo,
            description,
            due_date: dueDate,
            open,
            amount_lcy: totalAmount,
            remaining_amount_lcy: remainingAmount,
            reason_code: reasonCode
          } = invoice

          return { documentNo, description, dueDate: dateStringToUtc(dueDate), open: open === 'true', totalAmount: Math.floor(parseFloat(totalAmount.replace(/,/g, '')) * 100), remainingAmount: Math.floor(parseFloat(remainingAmount.replace(/,/g, '')) * 100), reasonCode }
        })

        return {
          balance: Math.floor(parseFloat(balance.replace(/,/g, '')) * 100),
          invoices
        }
      }
    },
    maintenanceJobTypes: {
      name: 'Maintenance Job Types > Get',
      logic: async ({ connectionContainer, config }) => {
        const [, , , , , urlOwnerApi] = config
        const { GetMaintenanceJobTypes: { MaintenanceJobType: response } } = await makeRequest(urlOwnerApi, getBody('OwnerAPI', 'GetMaintenanceJobTypes'), config)

        return response.map(type => ({
          id: type.code,
          name: type.description
        }))
      }
    },
    maintenanceJobsGet: {
      name: 'Maintenance Jobs > Get',
      logic: async ({ connectionContainer, config, body }) => {
        const [, , , , , urlOwnerApi] = config
        let { ownerId = '' } = body
        ownerId = ownerId.trim().toUpperCase()
        const fromEp = await makeRequest(urlOwnerApi, getBody('OwnerAPI', 'GetCustomerMaintenanceJobs', { 'customer_no': ownerId }), config)
        let { GetCustomerMaintenanceJobs: { MaintenanceJob: response } } = fromEp
        if (typeof response === 'object' && !Array.isArray(response)) {
          response = [response]
        }
        const formattedResponse = (response || []).map(job => ({
          maintenanceJobNumber: job.no,
          description: job.description,
          status: job.status,
          addedDate: job.added_date,
          completedDate: job.completed_date
        }))

        return formattedResponse
      }
    },
    maintenanceJobsCreate: {
      name: 'Maintenance Jobs > Create',
      logic: async ({ connectionContainer, config, body }) => {
        const [, , , , , urlOwnerApi] = config
        let { ownerId = '', reportedBy, description, type, permissionToEnterUnit } = body
        ownerId = ownerId.trim().toUpperCase()
        const { GetCustomerMaintenanceJobs: response } = await makeRequest(
          urlOwnerApi,
          getBody(
            'OwnerAPI',
            'CreateMaintenanceJob',
            {
              'customer_no': ownerId,
              'reported_by': reportedBy,
              'description': description,
              'type_code': type,
              'permission_to_enter_unit': permissionToEnterUnit
            }
          ),
          config
        )

        return response
      }
    },
    bookingAuthenticate: {
      name: 'Booking > Authenticate',
      logic: async ({ connectionContainer, config, body }) => {
        const [, clientSecret, , , urlBookingApi] = config
        let { bookingId = '', bookingEmail = '', clientSecret: bodyClientSecret } = body
        const knowsSomethingSecret = clientSecret === bodyClientSecret
        bookingId = bookingId.trim().toUpperCase()
        bookingEmail = bookingEmail.trim().toLowerCase()
        const { GetBooking: bookingJson } = await makeRequest(urlBookingApi, getBody('BookingAPI', 'GetBooking', { 'booking_no': bookingId }), config)
        !knowsSomethingSecret && bookingJson.email && assert(bookingJson.email.toLowerCase() === bookingEmail, `We found ${bookingId} but it doesn't belong to ${bookingEmail}.`)
        let {
          booking_no: id,
          email: rBookingEmail,
          park_code: parkCode
        } = bookingJson
        return {
          id,
          parkCode,
          email: knowsSomethingSecret ? rBookingEmail : undefined
        }
      }
    },
    bookingGet: {
      name: 'Booking > Get',
      logic: async ({ connectionContainer, config, body }) => {
        const [, , , , urlBookingApi] = config
        const { user } = connectionContainer
        let { bookingId } = body
        const { GetBooking: bookingJson } = await makeRequest(urlBookingApi, getBody('BookingAPI', 'GetBooking', { 'booking_no': bookingId }), config)
        let {
          booking_no: id,
          no_of_adults: countAdults,
          no_of_children: countChildren,
          notes,
          total_price: total,
          // amount_paid: total,
          // outstanding_amount: total
        } = bookingJson
        total = Math.floor(parseFloat(total) * 100)
        countAdults = parseInt(countAdults, 10)
        countChildren = parseInt(countChildren, 10)
        return {
          id,
          dates: {
            create: dateStringToUtc(bookingJson.added_date),
            start: dateStringToUtc(bookingJson.arrival_date),
            end: dateStringToUtc(bookingJson.departure_date),
            // start: 1644192000 || dateStringToUtc(bookingJson.arrival_date),
            // end: 1644537600 || dateStringToUtc(bookingJson.departure_date)
          },
          times: {
            checkIn: dateStringToUtc(bookingJson.arrival_date) + timeStringToSeconds(bookingJson.check_in_time) - user.timezone,
            checkOut: dateStringToUtc(bookingJson.departure_date) + timeStringToSeconds(bookingJson.check_out_time) - user.timezone
          },
          properties: {
            checkedIn: bookingJson.arrived !== 'false' || undefined,
            checkedOut: bookingJson.departed !== 'false' || undefined,
            cancelled: bookingJson.cancelled !== 'false' || undefined
          },
          permissions: {
            checkIn: bookingJson.can_check_in !== 'false',
            checkOut: bookingJson.can_check_out !== 'false'
          },
          crossUserSector: {
            name: [bookingJson.first_name, bookingJson.middle_name, bookingJson.surname]
              .filter(e => e)
              .join(' ') || undefined,
            email: bookingJson.email || undefined,
            phone: bookingJson.contact_no || bookingJson.mobile_phone_no || bookingJson.phone_no || undefined,
          },
          metadata: {
            firstName: bookingJson.first_name || undefined
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
    }
    // bookingPayGood: {
    //   name: 'Booking > Pay good',
    //   logic: async ({ config, body }) => {
    //     const reqBody1 = getBody('BookingAPI', 'MakePayment', { 'booking_no': body.bookingId, reference: body.paymentId.substring(0, 30), amount: (body.total / 100).toFixed(2) })
    //     const xmlResponse = await makeRequest(reqBody1, config, 'BookingAPI')
    //     let { receipt_no: paymentGatewayId } = xmlResponse.MakePayment
    //     if (body.doConfirm) {
    //       const reqBody2 = getBody('BookingAPI', 'ConfirmBooking', { 'booking_no': body.bookingId })
    //       await makeRequest(reqBody2, config)
    //     }
    //     return {
    //       paymentGatewayId
    //     }
    //   }
    // },
    // bookingPayBad: {
    //   name: 'Booking > Pay bad',
    //   logic: async ({ config, body }) => {
    //     const reqBody = getBody('BookingAPI', 'UntagBooking', { 'booking_no': body.bookingId })
    //     await makeRequest(reqBody, config, 'BookingAPI')
    //     return {}
    //   }
    // }
  }
})
