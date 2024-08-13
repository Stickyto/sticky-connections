const Connection = require('../Connection')
const makeRequest = require('./makeRequest.js')

async function eventHookLogic (type, config, connectionContainer) {
  const { event, payment, user, application, thing, createEvent } = connectionContainer

  const [configUrl] = config

  const webhookPackage = {
    v2: {
      event: event.toJsonPrivateWebhook(),
      payment: payment ? payment.toJsonPrivateWebhook() : undefined,
      flow: application ? application.toJsonPrivateWebhook(user) : undefined,
      sticky: thing ? thing.toJsonPrivateWebhook(user) : undefined,
      // session: dlGotSession ? dlGotSession.toJsonPrivateWebhook(user, application && application.id) : undefined
    },
    customData: event.customData.getRaw(),
    payment: payment && payment.toJsonPrivateWebhook(),
    application: application && application.toJsonPrivateWebhook(user),
    thing: thing && thing.toJsonPrivateWebhook(user),
    event: {
      type,
      id: event.id
    },
    partnerId: user.partnerId,
    federatedUserId: event.federatedUserId
  }

  global.rdic.logger.log({}, '[CONNECTION_CYCLR]', { configUrl, webhookPackage })

  try {
    await makeRequest('post', configUrl, webhookPackage)
    createEvent({
      type: 'CONNECTION_GOOD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      thingId: thing ? thing.id : undefined,
      customData: { id: 'CONNECTION_CYCLR', theirId: 'Success!' }
    })
  } catch ({ message }) {
    createEvent({
      type: 'CONNECTION_BAD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      customData: { id: 'CONNECTION_CYCLR', message }
    })
  }
}

module.exports = new Connection({
  id: 'CONNECTION_CYCLR',
  name: 'Cyclr',
  color: '#e23653',
  logo: cdn => `${cdn}/connections/CONNECTION_CYCLR.svg`,
  configNames: ['Partner webhook URL'],
  configDefaults: ['https://connections.sticky.to/api/partnerwebhook/SSuqwe5i'],
  eventHooks: {
    'SESSION_READ': (...args) => eventHookLogic('SESSION_READ, ', ...args),
    'SESSION_CART_PAY': (...args) => eventHookLogic('SESSION_CART_PAY, ', ...args)
  }
})
