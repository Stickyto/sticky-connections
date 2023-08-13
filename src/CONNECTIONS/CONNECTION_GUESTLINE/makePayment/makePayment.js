/* eslint-disable max-len */
const { assert } = require('@stickyto/openbox-node-utils')
const makeRequest = require('../makeRequest')

module.exports = async function makePayment (sessionId, { bookingReference, userIdInThisBooking, paymentCode, total, description = 'Payment from Sticky', billSplitId }) {
  const soapAction = ' http://tempuri.org/RLXSOAP19/RLXSOAP19/pmschg_PostPaymentToRoom'
  const xml = `<?xml version="1.0" encoding="utf-8"?>
  <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
      <pmschg_PostPaymentToRoom xmlns="http://tempuri.org/RLXSOAP19/RLXSOAP19">
        <SessionID>${sessionId}</SessionID>
        <BookRef>${bookingReference}</BookRef>
        ${userIdInThisBooking ? `<FolioID>${userIdInThisBooking}</FolioID>` : ''}
        ${billSplitId ? `<BillSplitID>${billSplitId}</BillSplitID>` : ''}
        <PaymentCode>${paymentCode}</PaymentCode>
        <Value>${(total / 100).toFixed(2)}</Value>
        <Description>${description}</Description>
      </pmschg_PostPaymentToRoom>
    </soap:Body>
  </soap:Envelope>
`

  const r = await makeRequest(soapAction, xml)
  assert(r.pmschg_PostPaymentToRoomResponse.pmschg_PostPaymentToRoomResult.ExceptionCode === '0', r.pmschg_PostPaymentToRoomResponse.pmschg_PostPaymentToRoomResult.ExceptionDescription)
  global.rdic.logger.log({}, '[CONNECTION_GUESTLINE] [method->makePayment]', { r })

  return true
}
