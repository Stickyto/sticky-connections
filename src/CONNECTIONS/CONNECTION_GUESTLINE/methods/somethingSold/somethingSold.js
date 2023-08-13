/* eslint-disable max-len */
const { assert } = require('@stickyto/openbox-node-utils')
const makeRequest = require('../../makeRequest')

module.exports = async function somethingSold (sessionId, { bookingReference, roomIndex, productCode, total, quantity = 1 }) {
  const soapAction = 'http://tempuri.org/RLXSOAP19/RLXSOAP19/pmsres_AddReservationUpsell'
  const xml = `<?xml version="1.0" encoding="utf-8"?>
  <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
    <soap12:Body>
      <pmsres_AddReservationUpsell xmlns="http://tempuri.org/RLXSOAP19/RLXSOAP19">
        <SessionID>${sessionId}</SessionID>
        <UpsellItem>
          <BookRef>${bookingReference}</BookRef>
          <RoomPickID>${roomIndex}</RoomPickID>
          <ProductCode>${productCode}</ProductCode>
          <Value>${(total / 100).toFixed(2)}</Value>
          <Quantity>${quantity}</Quantity>
        </UpsellItem>
      </pmsres_AddReservationUpsell>
    </soap12:Body>
  </soap12:Envelope>
`

  const r = await makeRequest(soapAction, xml)
  assert(r.pmsres_AddReservationUpsellResponse.pmsres_AddReservationUpsellResult.ExceptionCode === '0', r.pmsres_AddReservationUpsellResponse.pmsres_AddReservationUpsellResult.ExceptionDescription)
  global.rdic.logger.log({}, '[CONNECTION_GUESTLINE] [method->somethingSold]', { r })

  return true
}
