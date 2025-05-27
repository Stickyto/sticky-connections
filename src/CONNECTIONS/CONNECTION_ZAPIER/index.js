const { isUrl, assert, formatTime } = require('@stickyto/openbox-node-utils')
const gateways = require('@stickyto/openbox-gateways')
const Connection = require('../Connection')

async function eventHookLogic(config, connectionContainer) {
  const { user, application, thing, payment, event, customData, createEvent } = connectionContainer

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

  const gateway = gateways.getByName(payment.gateway)
  const json = {
    'Flow ID': application ? application.id : undefined,
    'Flow name': application ? application.name : undefined,

    'Sticky ID': thing ? thing.id : undefined,
    'Sticky name': thing ? thing.name : undefined,

    'Paid at': formatTime(payment.sessionPaidAt, user.timezone),
    [`${user.name} reference`]: payment.userPaymentId ? payment.userPaymentId : undefined,
    'Payment reference': payment.consumerIdentifier,
    'Payment total': (payment.total / 100).toFixed(2),
    'Payment currency': payment.currency,

    'Payment recurring total': typeof payment.totalCpa === 'number' && payment.totalCpa > 0 ? (payment.totalCpa / 100).toFixed(2) : undefined,
    'Payment recurring period': typeof payment.cpaPeriod === 'string' ? payment.cpaPeriod : undefined,

    'Payment name': payment.name || undefined,
    'Payment email': payment.email || undefined,
    'Payment phone': payment.phone || undefined,

    'Payment provider': gateway ? gateway.name : 'Unknown',
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
