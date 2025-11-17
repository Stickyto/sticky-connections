const Connection = require('../Connection')

async function eventHookLogic (config, connectionContainer) {
  const { user, application, payment, createEvent } = connectionContainer

  try {
  } catch (e) {
    createEvent({
      type: 'CONNECTION_BAD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      customData: { id: 'CONNECTION_GUESTY', message: e.message }
    })
  }
}

module.exports = new Connection({
  id: 'CONNECTION_GUESTY',
  name: 'Guesty',
  type: 'CONNECTION_TYPE_ERP',
  color: '#111111',
  logo: cdn => `${cdn}/connections/CONNECTION_GUESTY.svg`,
  configNames: [],
  configDefaults: [],
  eventHooks: {
    'SESSION_CART_PAY': eventHookLogic
  }
})
