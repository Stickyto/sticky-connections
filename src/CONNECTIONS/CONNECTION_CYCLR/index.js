/* eslint-disable max-len */
/* eslint-disable quotes */
const Connection = require('../Connection')
const makeRequest = require('./makeRequest.js')

async function eventHookLogic (config, connectionContainer) {
  const { user, application, thing, customData, createEvent } = connectionContainer

  const [configUrl] = config

  const webhookPackage = {
    v2: {
      event: {
        type: 'SESSION_READ',
      },
      // payment: payment ? payment.toJsonPrivateWebhook() : undefined,
      flow: application ? application.toJsonPrivateWebhook(user) : undefined,
      sticky: thing ? thing.toJsonPrivateWebhook(user) : undefined,
      // session: dlGotSession ? dlGotSession.toJsonPrivateWebhook(user, application && application.id) : undefined
    },
    customData: customData,
    // payment: payment && payment.toJsonPrivateWebhook(),
    application: application && application.toJsonPrivateWebhook(user),
    thing: thing && thing.toJsonPrivateWebhook(user),
    event: {
      type: 'SESSION_READ',
      // id: event.id
    },
    // partnerId: partner ? partner.id : undefined,
    // federatedUserId: federatedUserId || (federatedUser && federatedUser.id),
    // sessionId
  }

  try {
    await makeRequest('post', configUrl, webhookPackage)
    createEvent({
      type: 'CONNECTION_GOOD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      thingId: thing ? thing.id : undefined,
      customData: { id: 'CONNECTION_CYCLR', theirId: '123-456' }
    })
  } catch (e) {
    createEvent({
      type: 'CONNECTION_BAD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      customData: { id: 'CONNECTION_CYCLR', message: e.message }
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
    'SESSION_READ': eventHookLogic,
    'SESSION_CART_PAY': eventHookLogic
  }
})
