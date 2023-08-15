/* eslint-disable max-len */
const { assert } = require('@stickyto/openbox-node-utils')
const makeRequest = require('../../makeRequest')
const getBooking = require('../getBooking/getBooking')

module.exports = async function checkIn (sessionId, { bookingReference, bookingName }) {
  bookingReference = !bookingReference.includes('/') ? `${bookingReference}/1` : bookingReference 
  const [foundBooking] = await getBooking(sessionId, { bookingReference, bookingName })

  const soapAction = 'http://tempuri.org/RLXSOAP19/RLXSOAP19/pmsbkg_CheckIn'
  const xml = `<?xml version="1.0" encoding="utf-8"?>
  <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
    <soap12:Body>
      <pmsbkg_CheckIn xmlns="http://tempuri.org/RLXSOAP19/RLXSOAP19">
        <SessionID>${sessionId}</SessionID>
        <BookRef>${bookingReference}</BookRef>
        <AutoAddCheckInProducts>false</AutoAddCheckInProducts>
      </pmsbkg_CheckIn>
    </soap12:Body>
  </soap12:Envelope>
`
  const r = await makeRequest(soapAction, xml)
  assert(r.pmsbkg_CheckInResponse.pmsbkg_CheckInResult.ExceptionCode === '0', r.pmsbkg_CheckInResponse.pmsbkg_CheckInResult.ExceptionDescription)

  return foundBooking
}
