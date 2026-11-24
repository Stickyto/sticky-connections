const { assert, isUuid } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')

const TEST_FORCE_LOYALTY = false

function money (value, label) {
  assert(Number.isSafeInteger(value) && value >= 0, `${label} must be a non-negative amount in minor currency units.`)
  // Decimal strings belong only in the ngrok API payload; calculations use integers.
  return `${Math.trunc(value / 100)}.${String(value % 100).padStart(2, '0')}`
}

async function saveMember (rdic, user, session, member) {
  const userSector = session.userSectors.readFrom(user.id)
  const number = parseInt(member.Number, 10)
  const loyaltyPointsAvailable = parseInt(member.LoyaltyPointsAvailable, 10)
  assert(!isNaN(number), 'Neon returned an invalid membership number.')
  assert(!isNaN(loyaltyPointsAvailable), 'Neon returned an invalid points balance.')
  userSector.writeTo(`${user.name} customer number`, number)
  userSector.writeTo(`${user.name} name`, member.Forename.trim())
  userSector.writeTo(`${user.name} loyalty points available`, loyaltyPointsAvailable)
  userSector.writeTo(`${user.name} membership`, member.MembershipTypeName)
  const fullName = [member.Forename.trim(), (member.Surname || '').trim()].filter(Boolean).join(' ')
  if (!session.crossUserSector.readFrom('name')) {
    session.crossUserSector.writeTo('name', fullName)
  }
  session.hookUpdated()
  await rdic.get('datalayerRelational').updateOne('sessions', session.id,
    session.toDatalayerRelational(['userSectors', 'crossUserSector', 'updatedAt']))
  return { customerNumber: number, fullName, loyaltyPointsAvailable, membershipTypeName: member.MembershipTypeName }
}

async function eventHookLogic (config, connectionContainer) {
  const { rdic, user, payment, application, thing, createEvent } = connectionContainer

  const eventData = {
    userId: user.id,
    paymentId: payment.id,
    sessionId: payment.sessionId,
    applicationId: application ? application.id : undefined,
    thingId: thing ? thing.id : undefined
  }
  let reference, spendResult
  try {
    const [configUuid, configSecret, configItemNumber = '2'] = config
    const itemNumber = parseInt(configItemNumber, 10)
    assert(configUuid && configSecret, 'Configure the Neon2Cloud UUID and secret key.')
    assert(!isNaN(itemNumber), 'Configure a valid Neon hospitality item number.')
    const session = await rdic.dlGetSession(payment.sessionId)
    assert(session, 'The payment session could not be found.')
    const userSector = session.userSectors.readFrom(user.id)
    const customerNumber = parseInt(userSector.readFrom(`${user.name} customer number`), 10)
    assert(!isNaN(customerNumber), 'No validated Neon membership number was found in the payment session.')
    reference = payment.id.replace(/-/g, '').slice(0, 25)
    // Integer minor units: { 'Neon points': 100 } requests a 1.00 redemption.
    const selectedPoints = payment.customDataPublic?.get('Neon points')
    const rawLoyaltyTotal = selectedPoints ?? (TEST_FORCE_LOYALTY ? payment.total : 0)
    const requestedPoints = parseInt(rawLoyaltyTotal, 10) || 0
    const availablePoints = parseInt(userSector.readFrom(`${user.name} loyalty points available`), 10) || 0
    // Selected points are already included in the discount; payment.total is the remaining cash charge.
    const redemptionLimit = selectedPoints === undefined ? payment.total : (payment.discount || 0)
    const loyaltyTotal = Math.max(0, Math.min(requestedPoints, redemptionLimit, availablePoints))
    const body = {
      CustomerNumber: customerNumber,
      Item: { Id: itemNumber, Name: null, FixedPrice: false, Redeemable: true },
      Reference: reference,
      CustomerPaid: money(payment.total, 'Payment total'),
      CasinoPaid: money(payment.discount || 0, 'Payment discount'),
      LoyaltyCost: money(loyaltyTotal, 'Neon loyalty total'),
      Quantity: 1,
      Comment: `Sticky payment ${payment.id}`
    }
    // The test flag simulates opting in; otherwise only the payment metadata requests a debit.
    const response = await fetch(`https://neon2cloud-${configUuid}.ngrok.dev/hospitality-transactions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${configSecret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(45000)
    })
    spendResult = await response.json()
    console.warn('[CONNECTION_NEON] [DebugLater2048] spendResult', spendResult)
    if (spendResult.LoyaltyRedemption?.Success === true) {
      const memberResponse = await fetch(`https://neon2cloud-${configUuid}.ngrok.dev/members/${customerNumber}`, {
        headers: { Authorization: `Bearer ${configSecret}` },
        redirect: 'error',
        signal: AbortSignal.timeout(15000)
      })
      assert(memberResponse.status === 200, `Neon redeemed loyalty but balance refresh failed (HTTP ${memberResponse.status}).`)
      const member = await memberResponse.json()
      await saveMember(rdic, user, session, member)
    }
    assert(response.status === 200 && spendResult.HospitalityTransaction?.Success === true &&
      (loyaltyTotal === 0 || spendResult.LoyaltyRedemption?.Success === true),
    `Neon spend failed (HTTP ${response.status}): ${JSON.stringify(spendResult)}`)
  } catch (error) {
    await createEvent({
      ...eventData,
      type: 'CONNECTION_BAD',
      customData: { id: 'CONNECTION_NEON', reference, result: spendResult, message: error.message }
    })
    return
  }
  await createEvent({
    ...eventData,
    type: 'CONNECTION_GOOD',
    customData: { id: 'CONNECTION_NEON', theirId: reference }
  })
}

module.exports = new Connection({
  id: 'CONNECTION_NEON',
  name: 'Neon',
  type: 'CONNECTION_TYPE_ERP',
  color: '#0088cc',
  logo: cdn => `${cdn}/connections/CONNECTION_NEON.svg`,
  configNames: ['Neon2Cloud UUID', 'Neon2Cloud Secret key', 'Hospitality item number'],
  configDefaults: ['', '', '2'],
  methods: {
    validate: {
      name: 'Validate',
      logic: async ({ config, body, connectionContainer }) => {
        const { customerNumber, firstName, sessionId } = body
        const { rdic, user, createEvent } = connectionContainer
        try {
          assert(isUuid(sessionId), 'A valid session ID is required to check your membership.')
          const session = await rdic.dlGetSession(sessionId)
          assert(session, 'Your session could not be found.')
          const [configUuid, configSecret] = config
          const response = await fetch(
            `https://neon2cloud-${configUuid}.ngrok.dev/members/${encodeURIComponent(customerNumber)}`,
            {
              headers: {
                Authorization: `Bearer ${configSecret}`
              },
              redirect: 'error',
              signal: AbortSignal.timeout(15000)
            }
          )
          console.info('[CONNECTION_NEON] Member lookup response', {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type'),
            redirected: response.redirected,
            ngrokErrorCode: response.headers.get('ngrok-error-code')
          })
          if (response.status !== 200) {
            const responseBody = await response.text().catch(error => `Could not read response body: ${error.message}`)
            console.error('[CONNECTION_NEON] Member lookup failed', {
              status: response.status,
              responseBody: responseBody.slice(0, 2000)
            })
          }
          assert(response.status !== 404, "Sorry, that membership number isn't right.")
          assert(response.status === 200, 'Sorry, we could not check your membership right now. Please try again.')
          const asJson = await response.json()
          assert(
            typeof firstName === 'string' &&
            typeof asJson?.Forename === 'string' &&
            firstName.trim().toLowerCase() === asJson.Forename.trim().toLowerCase(),
            "Your membership number is correct but your first name doesn't match."
          )
          return await saveMember(rdic, user, session, asJson)
        } catch (error) {
          await createEvent({
            type: 'CONNECTION_BAD',
            userId: user.id,
            sessionId,
            customData: { id: 'CONNECTION_NEON', method: 'validate', message: error.message }
          })
          throw error
        }
      }
    }
  },
  eventHooks: {
    SESSION_CART_PAY: eventHookLogic
  }
})
