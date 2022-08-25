const { assert } = require('openbox-node-utils')

module.exports = {
  name: 'Inbound menu',
  logic: ({ connectionContainer, config, body }) => {
    const { rdic, user, createEvent } = connectionContainer
    const dlr = rdic.get('datalayerRelational')
    const { channelLinkId } = body

    let [configuredChannelLinkId] = config
    try {
      assert(channelLinkId === configuredChannelLinkId, `Channel link IDs do not match (${channelLinkId} vs configured ${configuredChannelLinkId})`)
    } catch (e) {
      createEvent({
        type: 'CONNECTION_BAD',
        userId: user.id,
        customData: { id: 'CONNECTION_DELIVERECT', message: e.message }
      })
    }
    // require('fs').writeFileSync('./webhook--CONNECTION_DELIVERECT.json', JSON.stringify(body))
    return {
      x1: 'x2'
    }
  }
}
