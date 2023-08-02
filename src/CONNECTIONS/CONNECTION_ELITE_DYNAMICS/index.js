const { assert } = require('@stickyto/openbox-node-utils')
const makeRequest = require('./makeRequest')

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
  partnerNames: ['Elite Dynamics', 'RoyaleResorts'],
  color: '#0D9277',
  logo: cdn => `${cdn}/connections/CONNECTION_ELITE_DYNAMICS.svg`,
  configNames: ['Client ID', 'Client Secret', 'Scope', 'OAuth URL', 'Code unit URL'],
  configDefaults: ['', '', 'https://api.businesscentral.dynamics.com/.default', 'https://login.microsoftonline.com/---/oauth2/v2.0/token', 'https://api.businesscentral.dynamics.com/v2.0/---/Sandbox/WS/Customer-Name/Codeunit'],
  methods: {
    ownerAuthenticate: {
      name: 'Owner > Authenticate',
      logic: async ({ connectionContainer, config, body }) => {
        let { ownerId = '', ownerEmail = '' } = body
        ownerId = ownerId.trim().toUpperCase()
        ownerEmail = ownerEmail.trim().toLowerCase()
        const { GetOwner: ownerJson } = await makeRequest(getBody('OwnerAPI', 'GetOwner', { 'customer_no': ownerId }), config, 'OwnerAPI')
        ownerJson.email && assert(ownerJson.email.toLowerCase() === ownerEmail, `We found someone with ID ${ownerId} but the email wasn't ${ownerEmail}.`)

        let dealJson
        try {
          ({ GetDeal: dealJson } = await makeRequest(getBody('OwnerAPI', 'GetDeal', { 'deal_no': ownerJson.current_deal_no }), config, 'OwnerAPI'))
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
        let { ownerId = '' } = body
        ownerId = ownerId.trim().toUpperCase()
        const { GetCustomerLedgerEntries: response } = await makeRequest(getBody('OwnerAPI', 'GetCustomerLedgerEntries', { 'customer_no': ownerId, 'open': false, 'document_type': 'Invoice' }), config, 'OwnerAPI')

        const {
          customer_balance: balance,
          CustomerLedgerEntry: customerLedgerEntries
        } = response

        const invoices = customerLedgerEntries.map(invoice => {
          const {
            document_no: documentNo,
            description,
            due_date: dueDate,
            open,
            amount_lcy: totalAmount,
            remaining_amount_lcy: remainingAmount,
            reason_code: reasonCode
          } = invoice

          return { documentNo, description, dueDate: dateStringToUtc(dueDate), open, totalAmount, remainingAmount, reasonCode }
        })

        return {
          balance: Math.trunc(parseFloat(balance.replace(/,/g, '')) * 100),
          invoices
        }
      }
    },
    maintenanceJobTypes: {
      name: 'Maintenance Job Types > Get',
      logic: async ({ connectionContainer, config }) => {
        const { GetMaintenanceJobTypes: { MaintenanceJobType: response } } = await makeRequest(getBody('OwnerAPI', 'GetMaintenanceJobTypes'), config, 'OwnerAPI')

        return response.map(type => ({
          id: type.code,
          name: type.description
        }))
      }
    },
    maintenanceJobsGet: {
      name: 'Maintenance Jobs > Get',
      logic: async ({ connectionContainer, config, body }) => {
        let { ownerId = '' } = body
        ownerId = ownerId.trim().toUpperCase()
        const fromEp = await makeRequest(getBody('OwnerAPI', 'GetCustomerMaintenanceJobs', { 'customer_no': ownerId }), config, 'OwnerAPI')
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
        let { ownerId = '', reportedBy, description, type, permissionToEnterUnit } = body
        ownerId = ownerId.trim().toUpperCase()
        const { GetCustomerMaintenanceJobs: response } = await makeRequest(
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
          config,
          'OwnerAPI'
        )

        return response
      }
    },
    bookingAuthenticate: {
      name: 'Booking > Authenticate',
      logic: async ({ connectionContainer, config, body }) => {
        let { bookingId = '', bookingEmail = '' } = body
        bookingId = bookingId.trim().toUpperCase()
        bookingEmail = bookingEmail.trim().toLowerCase()
        const { GetBooking: bookingJson } = await makeRequest(getBody('BookingAPI', 'GetBooking', { 'booking_no': bookingId }), config, 'BookingAPI')
        bookingJson.email && assert(bookingJson.email.toLowerCase() === bookingEmail, `We found ${bookingId} but it doesn't belong to ${bookingEmail}.`)
        let {
          booking_no: id,
        } = bookingJson
        return {
          id
        }
      }
    },
    bookingGet: {
      name: 'Booking > Get',
      logic: async ({ connectionContainer, config, body }) => {
        const { user } = connectionContainer
        let { bookingId } = body
        const { GetBooking: bookingJson } = await makeRequest(getBody('BookingAPI', 'GetBooking', { 'booking_no': bookingId }), config, 'BookingAPI')
        let {
          booking_no: id,
          no_of_adults: countAdults,
          no_of_children: countChildren,
          notes,
          total_price: total,
          // amount_paid: total,
          // outstanding_amount: total
        } = bookingJson
        total = Math.trunc(parseFloat(total) * 100)
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
    },
    // bookingCreate: {
    //   name: 'Booking > Create',
    //   logic: async ({ config }) => {
    //     const body = getBody('BookingAPI', 'CreateBooking', {})
    //     const xmlResponse = await makeRequest(body, config, 'BookingAPI')
    //     const { booking_no: id } = xmlResponse.CreateBooking
    //     return {
    //       id
    //     }
    //   }
    // },
    // bookingUpdate: {
    //   name: 'Booking > Update',
    //   logic: async ({ config, body }) => {
    //     const reqBody = getBody('BookingAPI', 'UpdateNotes', { 'booking_no': body.bookingId, notes: body.text })
    //     await makeRequest(reqBody, config, 'BookingAPI')
    //     return {}
    //   }
    // },
    // bookingCheckIn: {
    //   name: 'Booking > Check in',
    //   logic: async ({ config, body }) => {
    //     const reqBody = getBody('BookingAPI', 'CheckInBooking', { 'booking_no': body.bookingId })
    //     await makeRequest(reqBody, config, 'BookingAPI')
    //     return {}
    //   }
    // },
    // bookingCheckOut: {
    //   name: 'Booking > Check out',
    //   logic: async ({ config, body }) => {
    //     const reqBody = getBody('BookingAPI', 'CheckOutBooking', { 'booking_no': body.bookingId })
    //     await makeRequest(reqBody, config, 'BookingAPI')
    //     return {}
    //   }
    // },
    // bookingPayStart: {
    //   name: 'Booking > Pay start',
    //   logic: async ({ config, body }) => {
    //     const reqBody = getBody('BookingAPI', 'TagBooking', { 'booking_no': body.bookingId })
    //     await makeRequest(reqBody, config, 'BookingAPI')
    //     return {}
    //   }
    // },
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
