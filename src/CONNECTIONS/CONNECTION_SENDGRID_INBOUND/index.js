const { assert, isUuid } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_SENDGRID_INBOUND',
  name: 'SendGrid Inbound',
  color: '#322CBE',
  logo: cdn => `${cdn}/connections/CONNECTION_API.svg`,
  configNames: [],
  configDefaults: [],
  userIds: ['97b727d7-65c1-4a4f-b5a3-18f6afc60c4b'],
  methods: {
    'inbound-ffe73115-22a5': {
      name: 'inbound-ffe73115-22a5',
      logic: async calledWith => {
        const [leftHandSide] = calledWith.body.to.split('@')
        const [userId, userIdRest] = leftHandSide.split('---')
        assert(isUuid(userId), `Please send emails to [user-id]---[...]@[...] (userId=${userId})`)

        const regex = /https?:\/\/[^\s"'>]+/g
        const urls = calledWith.body.html.match(regex) || []
        const url = urls.find(u => u.startsWith('https://partners.trustist.com'))

        assert(url, `Could not find a Trustist URL! (urls.length=${urls.length})`)

        await calledWith.connectionContainer.createEvent({
          type: 'CONNECTION_GOOD',
          userId,
          customData: { id: 'CONNECTION_SENDGRID_INBOUND', method: 'inbound-ffe73115-22a5', theirId: url }
        })
      }
    }
  }
})
