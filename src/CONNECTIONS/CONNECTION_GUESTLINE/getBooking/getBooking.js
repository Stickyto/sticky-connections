/* eslint-disable max-len */
const { assert } = require('@stickyto/openbox-node-utils')
const makeRequest = require('../makeRequest')
const remoteDateToEpoch = require('../remoteDateToEpoch/remoteDateToEpoch')
const forceArray = require('../forceArray/forceArray')

function mapGuest (guest) {
  return{
    id: guest.ProfileRef,
    idInThisBooking: guest.FolioID,
    name: guest.Name,
    isAdult: guest.TypeOfPerson === 'Adult',
    genderString: guest.Gender['xsi:nil'] === 'true' ? 'unknown' : guest.Gender.toLowerCase()
  }
}

module.exports = async function getBooking (sessionId, bookingReference) {
  const soapAction = ' http://tempuri.org/RLXSOAP19/RLXSOAP19/pmsbkg_BookingSearch'
  const xml = `<?xml version="1.0" encoding="utf-8"?>
  <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
      <pmsbkg_BookingSearch xmlns="http://tempuri.org/RLXSOAP19/RLXSOAP19">
        <SessionID>${sessionId}</SessionID>
        <Filters>
          <BookRef>${bookingReference}</BookRef>
        </Filters>
      </pmsbkg_BookingSearch>
    </soap:Body>
  </soap:Envelope>
`
  const r = await makeRequest(soapAction, xml)
  assert(r.pmsbkg_BookingSearchResponse.pmsbkg_BookingSearchResult.ExceptionCode === '0', r.pmsbkg_BookingSearchResponse.pmsbkg_BookingSearchResult.ExceptionDescription)
  global.rdic.logger.log({}, '[CONNECTION_GUESTLINE]', { r })

  return forceArray(r.pmsbkg_BookingSearchResponse.SearchResults.Reservations.Reservation)
    .map(_ => ({
      id: _.BookRef,
      roomId: _.RoomId,
      dates: {
        start: remoteDateToEpoch(_.Arrival),
        end: remoteDateToEpoch(_.Departure)
      },
      payment: {
        total: Math.ceil(parseFloat(_.TotalCostGross) * 100)
      },
      userPrimary: mapGuest(_.Contact),
      users: forceArray(_.Guests.Guest).map(__ => mapGuest(__))
    }))
}
