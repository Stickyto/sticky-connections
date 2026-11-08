const { deserialize, isUrl } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')

function doFail (createEvent, message, { user, application }) {
  return createEvent({
    type: 'CONNECTION_BAD',
    userId: user.id,
    applicationId: application ? application.id : undefined,
    customData: { id: 'CONNECTION_WHATSAPP', message }
  })
}

module.exports = new Connection({
  id: 'CONNECTION_WHATSAPP',
  name: 'WhatsApp',
  type: 'CONNECTION_TYPE_ERP',
  color: '#25D366',
  configNames: ['WhatsApp2Cloud Secret key'],
  configDefaults: [''],
  eventHooks: {
    'LD_V2': async function (config, connectionContainer) {
      const { user, application, thing, customData, createEvent } = connectionContainer
      if (!user.can('traffic-light-status')) {
        return
      }
      const systemId = thing && thing.customData.get('Traffic Light Status system')
      const ignoreThing = typeof systemId !== 'string' || systemId.trim().length === 0
      if (ignoreThing) {
        return
      }
      const priorityValue = customData && customData['This is a...']
      const priority = typeof priorityValue === 'string' ? priorityValue.slice(0, 2) : undefined
      const ignorePriority = !['P0', 'P1', 'P2'].includes(priority)
      if (ignorePriority) {
        return
      }
      const chatName = application && application.theirId
      const ignoreApplication = typeof chatName !== 'string' || chatName.trim().length === 0
      if (ignoreApplication) {
        return
      }
      const [_configSecretKey] = config
      try {
        const description = String(customData['Anything else we should know?'] || 'No description supplied.')
        const photoUrl = deserialize(customData['What can you see?'], user, true)
        const message = [
          `[${priority}] Traffic Light Status incident`,
          `System: ${systemId}`,
          thing ? `Asset: ${thing.name || 'Unknown asset'} (${thing.theirId || '?'})` : undefined,
          `Description: ${description}`,
          typeof photoUrl === 'string' && isUrl(photoUrl) ? `Photo: ${photoUrl}` : undefined
        ].filter(Boolean).join(' | ').replace(/\s+/g, ' ').replace(/[^\x20-\x7E]/g, '').trim()
        const response = await fetch(
          'https://sticky-whatsapp-e3843480-3f6b-4796-9bac-4fdf6fad315d.eu.ngrok.io/send',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${_configSecretKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ chatName, message })
          }
        )
        global.rdic.logger.log({ user }, '[CONNECTION_WHATSAPP] Send response', {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          redirected: response.redirected,
          ngrokErrorCode: response.headers.get('ngrok-error-code')
        })
        if (response.status !== 200) {
          const responseBody = await response.text().catch(error => `Could not read response body: ${error.message}`)
          global.rdic.logger.log({ user }, '[CONNECTION_WHATSAPP] Send failed', {
            status: response.status,
            responseBody: responseBody.slice(0, 2000)
          })
          throw new Error('Sorry, we could not send your WhatsApp message right now. Please try again.')
        }
      } catch (e) {
        return doFail(createEvent, e.message, { user, application })
      }
      await createEvent({
        type: 'CONNECTION_GOOD',
        userId: user.id,
        applicationId: application ? application.id : undefined,
        customData: { id: 'CONNECTION_WHATSAPP' }
      })
    }
  }
})
