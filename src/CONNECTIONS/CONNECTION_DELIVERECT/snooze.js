const { assert } = require('@stickyto/openbox-node-utils')

module.exports = {
  name: 'Snooze',
  logic: async ({ connectionContainer, config, body }) => {
    const {
      rdic,
      user,
      createEvent,
      getProducts
    } = connectionContainer

    const { channelLinkId } = body
    let [, configuredChannelLinkIds] = config
    configuredChannelLinkIds = configuredChannelLinkIds.split(',').map(_ => _.trim())

    const actionMap = new Map([
      ['snooze', false],
      ['unsnooze', true]
    ])

    let messages = []
    try {
      const foundChannelLinkId = configuredChannelLinkIds.find(_ => _ === channelLinkId)
      assert(foundChannelLinkId, `[CONNECTION_DELIVERECT] [snooze] [1] Channel link IDs do not match (foundChannelLinkId is falsy; ${channelLinkId} provided vs one of configured ${configuredChannelLinkIds.join(' / ')})`)

      const action = body.operations[0].action
      const theAction = actionMap.get(action)
      assert(typeof theAction === 'boolean', '[snooze] "action" body key is not valid; are you really Deliverect?')

      const plusWithoutChannelLinks = body.operations[0].data.items.map(_ => _.plu)
      const plusWithChannelLinks = plusWithoutChannelLinks.map(_ => `${foundChannelLinkId}---${_}`)

      const allPsToday = await getProducts(rdic, user, { connection: 'CONNECTION_DELIVERECT', their_id: `startsWith:${foundChannelLinkId}---` })

      const plusMappedToProducts = plusWithChannelLinks
        .map(plu => allPsToday.find(_ => _.theirId === plu))
      const plusMappedToProductsFilteredAndAsPlusAgain = plusMappedToProducts
        .filter(_ => _)
        .map(_ => _.theirId)

      messages.push(`Found level products (${plusMappedToProductsFilteredAndAsPlusAgain.length} updated of ${plusMappedToProducts.length} matched of ${allPsToday.length} total in channel link ${foundChannelLinkId})`)

      for (let allPi = 0; allPi < allPsToday.length; allPi++) {
        const eachProduct = allPsToday[allPi]
        let mustUpdateProduct = false
        eachProduct.questions.forEach(q => {
          q.options.forEach(o => {
            if (plusWithoutChannelLinks.includes(o.theirId)) {
              o.forSale = theAction
              mustUpdateProduct = eachProduct
            }
          })
        })
        if (mustUpdateProduct) {
          const asDlr = mustUpdateProduct.toDatalayerRelational(['questions'])
          await rdic.get('datalayerRelational').updateOne('products', mustUpdateProduct.id, asDlr)
          messages.push(`Question-option product ${mustUpdateProduct.id} -> ${mustUpdateProduct.name}`)
        }
      }

      const query = { user_id: user.id, their_id: plusWithChannelLinks, connection: 'CONNECTION_DELIVERECT' }
      global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [snooze]', { plusWithoutChannelLinks, plusWithChannelLinks, plusMappedToProductsFilteredAndAsPlusAgain, query })
      await rdic.get('datalayerRelational').updateMany('products', query, `is_enabled = ${theAction}`)

      createEvent({
        type: 'CONNECTION_GOOD',
        userId: user.id,
        customData: { id: 'CONNECTION_DELIVERECT', theirId: 'Snooze', originalBody: body }
      })
    } catch (e) {
      createEvent({
        type: 'CONNECTION_BAD',
        userId: user.id,
        customData: { id: 'CONNECTION_DELIVERECT', message: e.message }
      })
      throw e
    }
    global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [snooze]', { messages })
    return {
      message: messages.join(' / '),
      originalBody: body
    }
  }
}
