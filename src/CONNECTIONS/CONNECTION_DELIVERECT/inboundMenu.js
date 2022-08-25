const { assert, getNow } = require('openbox-node-utils')

module.exports = {
  name: 'Inbound menu',
  logic: async ({ connectionContainer, config, body }) => {
    const {
      rdic,
      user,
      createEvent,

      getProductCategories,
      getProducts,

      updateProductCategory,
      updateProduct,

      createProductCategory,
      createProduct
    } = connectionContainer
    const { channelLinkId, categories: theirCategories, products: theirProducts, modifierGroups, modifiers } = body[0]

    let [configuredChannelLinkId] = config
    try {
      assert(channelLinkId === configuredChannelLinkId, `[inboundMenu] Channel link IDs do not match (${channelLinkId} vs configured ${configuredChannelLinkId})`)

      let nextIPc = 0
      let nextIP = 0

      const allPcsToday = await getProductCategories(rdic, user, 'CONNECTION_DELIVERECT')
      const allPsToday = await getProducts(rdic, user, 'CONNECTION_DELIVERECT')

      let handledPcs = [], handledPs = []

      console.warn('xxx theirProducts', theirProducts.length)

      const productsIds = Object.keys(theirProducts)
      const howManyPs = productsIds.length
      for (let productI = 0; productI < howManyPs; productI++) {
        const theirP = theirProducts[productsIds[productI]]
        console.warn('xxx theirP', theirP)
        let foundExistingP = allPsToday.find(maybeExistingP => maybeExistingP.theirId === theirP._id)

        global.rdic.logger.log({}, '[job-CONNECTION_DELIVERECT] [go]', theirP.name)
        if (foundExistingP) {
          foundExistingP.patch({

          })
          await updateProduct(foundExistingP)
          handledPs.push(foundExistingP.id)
        } else {
          const payload = {
            userId: user.id,
            theirId: theirP.id,
            createdAt: getNow() + nextIP,
            connection: 'CONNECTION_DELIVERECT',
            currency: user.currency,
            price: theirP.price,
            name: theirP.name.trim(),
            description: theirP.description.trim(),
            isEnabled: !theirP.snoozed,
            media: theirP.imageUrl ? [{ type: 'image', url: theirP.imageUrl }] : [],
            questions: theirP.subProducts.map(sp => {
              const foundMg = modifierGroups[sp]
              const options = foundMg.subProducts.map(sp2 => {
                const foundM = modifiers[sp2]
                return {
                  name: foundM.name.trim(),
                  delta: foundM.price,
                  media: [],
                  description: foundM.description.trim()
                }
              })
              const answer = options.length > 0 ? options[0].name : ''
              return {
                type: 'option',
                question: foundMg.name.endsWith('?') ? foundMg.name : `${foundMg.name}?`,
                answer,
                options
              }
            })
          }
          const createdId = (await createProduct({
            ...payload,
            id: undefined
          })).id
        }
        nextIP++
      }

      // for (let categoryI = 0; categoryI < theirCategories.length; categoryI++) {
      //   const theirPc = theirCategories[categoryI]
      //   let foundExistingPc = allPcsToday.find(maybeExistingPc => maybeExistingPc.theirId === theirPc._id)
      //   global.rdic.logger.log({}, '[job-CONNECTION_DELIVERECT] [go]', theirPc.name)

      //   if (foundExistingPc) {
      //     foundExistingPc.name = theirPc.name.trim()
      //     foundExistingPc.description = theirPc.description.trim()
      //     foundExistingPc.products.clear()
      //     // finalPList
      //     //   .filter(ti => ti._.categoryId === foundExistingPc.theirId)
      //     //   .forEach(ti => {
      //     //     foundExistingPc.products.add(ti.id)
      //     //   })
      //     // foundExistingPc.view = 'grid-name'
      //     await updateProductCategory(foundExistingPc)
      //     handledPcs.push(foundExistingPc.id)
      //   } else {
      //     foundExistingPc = await createProductCategory(
      //       {
      //         userId: user.id,
      //         name: theirPc.name,
      //         description: theirPc.description,
      //         theirId: theirPc._id,
      //         createdAt: getNow() + nextIPc,
      //         connection: 'CONNECTION_DELIVERECT',
      //         view: 'grid-name',
      //         // products: (() => {
      //         //   const toReturn = finalPList
      //         //     .filter(ti => ti._.categoryId === theirPc.id)
      //         //     .map(ti => ti.id)
      //         //   return toReturn
      //         // })()
      //       },
      //       user
      //     )
      //     nextIPc++
      //   }
      // }

    } catch (e) {
      createEvent({
        type: 'CONNECTION_BAD',
        userId: user.id,
        customData: { id: 'CONNECTION_DELIVERECT', message: e.message }
      })
      throw e
    }
    return {}
  }
}
