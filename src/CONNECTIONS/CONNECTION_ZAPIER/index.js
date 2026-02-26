const { isUrl, assert, formatTime } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')

async function eventHookLogic (config, connectionContainer) {
  const { user, application, thing, payment, event, customData, createEvent } = connectionContainer

  const whichFu = await rdic.dlGetFederatedUser({ userId: user.id, federatedUserId: payment.lastFederatedUserId })

  function goFail(e) {
    createEvent({
      type: 'CONNECTION_BAD',
      userId: user.id,
      paymentId: event.paymentId,
      applicationId: application ? application.id : undefined,
      thingId: thing ? thing.id : undefined,
      customData: {id: 'CONNECTION_ZAPIER', message: e.message}
    })
  }

  const [configZapUrl] = config
  try {
    assert(isUrl(configZapUrl), 'Zap URL is not a URL.')
  } catch (e) {
    goFail(e)
    return
  }

  const json = {
    'Flow ID': application ? application.id : undefined,
    'Flow name': application ? application.name : undefined,

    'Sticky ID': thing ? thing.id : undefined,
    'Sticky name': thing ? thing.name : undefined,

    'Team member name': whichFu ? whichFu.name : undefined,
    'Team member email': whichFu ? whichFu.email : undefined,

    'Paid at': formatTime(payment.sessionPaidAt, user.timezone),
    [`${user.name} reference`]: payment.userPaymentId ? payment.userPaymentId : undefined,
    'Payment reference': payment.consumerIdentifier,
    'Payment total': (payment.total / 100).toFixed(2),
    'Payment currency': payment.currency,

    'Payment recurring total': typeof payment.totalCpa === 'number' && payment.totalCpa > 0 ? (payment.totalCpa / 100).toFixed(2) : undefined,
    'Payment recurring period': typeof payment.cpaPeriod === 'string' ? payment.cpaPeriod : undefined,
    'Payment recurring maximum': typeof payment.cpaMaxLength === 'number' ? payment.cpaMaxLength : undefined,
    'Payment recurring start': typeof payment.cpaInPeriod === 'number' ? formatTime(payment.cpaInPeriod, user.timezone, user.country, false, false) : undefined,

    'Payment name': payment.name || undefined,
    'Payment email': payment.email || undefined,
    'Payment phone': payment.phone || undefined,

    'Payment provider ID': payment.paymentGatewayId || undefined,
    'Paid with': payment.paymentGatewayExtra || undefined,
    ...payment.customDataPublic.getRaw()
  }
  global.rdic.logger.log({ user }, '[CONNECTION_ZAPIER]', { configZapUrl, json })

  try {
    const response = await fetch(
      configZapUrl,
      {
        method: 'post',
        headers: new Headers({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify(json)
      }
    )

    assert(response.status === 200, `Failed: received a non-200 status code from Zapier (${response.status}).`)
    const body = await response.json()
    global.rdic.logger.log({ user }, '[CONNECTION_ZAPIER]', { body })
  } catch (e) {
    global.rdic.logger.log('[CONNECTION_ZAPIER] fail', e.message)
    goFail(e)
  }
}

module.exports = new Connection({
  id: 'CONNECTION_ZAPIER',
  type: 'CONNECTION_TYPE_ERP',
  name: 'Zapier',
  color: '#ff4f01',
  logo: cdn => `${cdn}/connections/CONNECTION_ZAPIER.svg`,
  configNames: ['Zap URL'],
  configDefaults: ['https://hooks.zapier.com/hooks/catch/...'],
  eventHooks: {
    'SESSION_CART_PAY': eventHookLogic
  }
})
