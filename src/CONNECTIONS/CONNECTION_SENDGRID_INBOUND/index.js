const { assert, isUuid } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_SENDGRID_INBOUND',
  name: 'SendGrid Inbound',
  color: '#322CBE',
  logo: cdn => `${cdn}/connections/CONNECTION_EXTERNAL_PAYMENT.svg`,
  configNames: [],
  configDefaults: [],
  userIds: ['97b727d7-65c1-4a4f-b5a3-18f6afc60c4b'],
  methods: {
    'inbound-ffe73115-22a5': {
      name: 'inbound-ffe73115-22a5',
      logic: async calledWith => {
        try {
          const theirId = JSON.stringify(calledWith.body, null, 2)
          global.rdic.logger.log({}, '[CONNECTION_SENDGRID_INBOUND] [inbound-ffe73115-22a5]', theirId)
          await calledWith.connectionContainer.createEvent({
            type: 'CONNECTION_GOOD',
            userId,
            customData: { id: 'CONNECTION_SENDGRID_INBOUND', method: 'inbound-ffe73115-22a5', theirId }
          })
        } catch ({ message }) {
          await calledWith.connectionContainer.createEvent({
            type: 'CONNECTION_BAD',
            userId: calledWith.connectionContainer.user.id,
            customData: { id: 'CONNECTION_SENDGRID_INBOUND', message: `inbound-ffe73115-22a5: ${message}` }
          })
        }
      }
    }
  }
})
