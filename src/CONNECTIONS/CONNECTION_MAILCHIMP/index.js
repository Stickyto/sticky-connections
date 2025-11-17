const { assert, isEmailValid } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')
const makeRequest = require('./makeRequest')

async function eventHookLogic (config, connectionContainer) {
  const { user, application, thing, customData, createEvent } = connectionContainer

  const [configServer, configApiKey, configList] = config

  let foundEmailAddress = Object.values(customData)
    .find(v => isEmailValid(v))

  global.rdic.logger.log({}, '[CONNECTION_MAILCHIMP]', { configServer, configApiKey, configList, customData, foundEmailAddress })

  if (!foundEmailAddress) {
    return
  }

  try {
    const { lists } = await makeRequest(configApiKey, 'get', `https://${configServer}.api.mailchimp.com/3.0/lists`, undefined)
    const foundList = lists.find(_ => _.name === configList)
    assert(foundList, `There isn't a list called "${configList}". The lists are ${lists.map(_ => `"${_.name}"`).join('/')}.`)

    const { id: theirId } = await makeRequest(
      configApiKey,
      'put',
      `https://${configServer}.api.mailchimp.com/3.0/lists/${foundList.id}/members/${foundEmailAddress}`,
      {
        email_address: foundEmailAddress,
        status_if_new: 'subscribed'
      }
    )
    createEvent({
      type: 'CONNECTION_GOOD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      thingId: thing ? thing.id : undefined,
      customData: { id: 'CONNECTION_MAILCHIMP', theirId }
    })
  } catch (e) {
    createEvent({
      type: 'CONNECTION_BAD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      customData: { id: 'CONNECTION_MAILCHIMP', message: e.message }
    })
  }
}

module.exports = new Connection({
  id: 'CONNECTION_MAILCHIMP',
  type: 'CONNECTION_TYPE_ERP',
  name: 'Mailchimp',
  color: '#000000',
  logo: cdn => `${cdn}/connections/CONNECTION_MAILCHIMP.svg`,
  configNames: ['Server', 'API key', 'List'],
  configDefaults: ['us21', '', ''],
  eventHooks: {
    'LD_V2': eventHookLogic
  }
})

