/* eslint-disable quotes */
const { assert, sanitize, getNow } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')
const makeRequest = require('./makeRequest')

const COLOR = '#00A1E4'

const CATEGORY_COLORS = new Map([
  ['LIME', '#CDDC39'],
  ['RED', '#F44336'],
  ['GREEN', '#4CAF50'],
  ['BLUE', '#2196F3'],
  ['PURPLE', '#9C27B0'],
  ['GREY', '#E0E0E0'],
  ['ORANGE', '#FF9800'],
  ['PINK', '#E91E63']
])
const CATEGORY_COLOR_DEFAULT = CATEGORY_COLORS.get('GREY')

async function getStore(config) {
  global.rdic.logger.log({}, '[job-CONNECTION_LOYALVERSE] [getStore]', { config })
  const [, storeName] = config
  const { stores } = await makeRequest(config, '/v1.0/stores')
  const foundStore = stores.find(_ => _.name.toLowerCase() === storeName.toLowerCase())
  assert(foundStore, `There is no store with ID "${storeName}". The store names are: ${stores.map(_ => `"${_.name}"`).join(', ')}.`)
  return foundStore
}

async function getCategories(config) {
  global.rdic.logger.log({}, '[job-CONNECTION_LOYALVERSE] [getCategories]')
  const data = await makeRequest(config, '/v1.0/categories?limit=250')
  return data.categories.map(_ => ({
    id: _.id,
    name: _.name,
    color: CATEGORY_COLORS.get(_.color) || CATEGORY_COLOR_DEFAULT,
    products: []
  }))
}

function formatVariant(v) {
  return [v.option1_value, v.option2_value, v.option3_value].filter(e => e).join(' / ')
}

function isVariantForSale(variant, store) {
  const foundStore = variant.stores.find(_ => _.store_id === store.id)
  return foundStore.available_for_sale
}

function getFirstVariantForSale(variants, store) {
  return variants.find(variant => isVariantForSale(variant, store))
}

async function getItems(config, foundStore) {
  global.rdic.logger.log({}, '[job-CONNECTION_LOYALVERSE] [getItems]', { foundStore })
  const data = await makeRequest(config, '/v1.0/items?limit=250')
  return data.items.map(_ => ({
    id: _.id,
    name: _.item_name,
    color: CATEGORY_COLORS.get(_.color) || CATEGORY_COLOR_DEFAULT,
    media: _.image_url ? [{ type: 'image', url: _.image_url }] : [],
    description: _.description ? sanitize(_.description, true) : undefined,
    price: (() => {
      const variantsForSale = _.variants.filter(v => isVariantForSale(v, foundStore))
      if (variantsForSale.length === 0) {
        return Math.ceil(_.variants[0].stores.find(s => s.store_id === foundStore.id).price * 100)
      }
      if (variantsForSale.length === 1) {
        return Math.ceil(variantsForSale[0].stores.find(s => s.store_id === foundStore.id).price * 100)
      }
      return 0
    })(),
    // isEnabled: (() => {
    //   return getFirstVariantForSale(_.variants, foundStore) ? true : false
    // })(),
    questions: (() => {
      if (_.variants.length === 1) {
        return []
      }

      const firstVariantForSale = getFirstVariantForSale(_.variants, foundStore)
      if (!firstVariantForSale) {
        return []
      }

      return [
        {
          type: 'option',
          question: [_.option1_name, _.option2_name, _.option3_name].filter(e => e).join(' / '),
          options: _.variants
            .filter(v => {
              const thisStore = v.stores.find(_ => _.store_id === foundStore.id)
              return thisStore.available_for_sale
            })
            .map(v => {
              const thisStore = v.stores.find(s => s.store_id === foundStore.id)
              return {
                name: formatVariant(v),
                delta: Math.ceil(thisStore.price * 100)
              }
            }),
          answer: formatVariant(firstVariantForSale)
        }
      ]
    })(),
    _: {
      categoryId: _.category_id
    }
  }))
}

module.exports = new Connection({
  id: 'CONNECTION_LOYALVERSE',
  name: 'Loyverse',
  shortName: 'L',
  color: COLOR,
  logo: cdn => `${cdn}/connections/CONNECTION_LOYALVERSE.svg`,
  configNames: ['PASTE HERE: Access token', 'PASTE HERE: Store name'],
  configDefaults: ['', ''],
  instructions: ({ rdic, user, applications }) => [
    {
      'id': '71d05208-3781-4c24-996e-c4c0d1c6b228',
      'config': {
        'what': 'Sticky syncs with Loverse every 5 minutes.',
        'font': `${COLOR}--center--100%--false`,
        'icon': 'hand'
      }
    },
    {
      "id": "6121bb17-a3b4-4df4-b64e-1149ce4d7140",
      "config": {}
    },
    {
      "id": "9545852c-d64a-457a-8ca0-2b2d1173de9b",
      "config": {
        "url": "https://cdn.sticky.to/application-blocks/used/loyverse--add-access-token.png",
        "dropShadow": false,
        "corners": "Rounded corners",
        "specialEffect": "None",
        "goToUrl": ""
      }
    },
    {
      "id": "a21eddf2-aa86-4b6a-a2af-8ac279b246f7",
      "config": {
        "action": "url~~||~~https://r.loyverse.com/dashboard/#/integrations/tokens~~||~~false",
        "label": "Go to Loyverse access tokens",
        "colour": "#F3F5F7",
        "foregroundColour": "#202058",
        "icon": "",
        "fullWidth": false
      }
    },
    {
      "id": "71d05208-3781-4c24-996e-c4c0d1c6b228",
      "config": {
        "what": "Go to <strong>Integrations</strong> → <strong>Access tokens</strong>.\n\nChoose <strong>ADD ACCESS TOKEN</strong>.",
        "font": "#202058--center--100%--false",
        "backgroundColour": "#ffffff",
        "icon": ""
      }
    },
    {
      "id": "81e88b40-b16a-4619-a659-2881ea326217",
      "config": {
        "colour": COLOR,
        "foregroundColour": "#FFFFFF"
      }
    },
    {
      "id": "9545852c-d64a-457a-8ca0-2b2d1173de9b",
      "config": {
        "url": "https://cdn.sticky.to/application-blocks/used/loyverse--name-access-token.png",
        "dropShadow": false,
        "corners": "Rounded corners",
        "specialEffect": "None",
        "goToUrl": ""
      }
    },
    {
      "id": "71d05208-3781-4c24-996e-c4c0d1c6b228",
      "config": {
        "what": "Name the access token \"<strong>Sticky</strong>\".\n\nUncheck <strong>Token has expiration date</strong>.\n\nChoose <strong>Save</strong>.",
        "font": "#202058--center--100%--false",
        "backgroundColour": "#ffffff",
        "icon": ""
      }
    },
    {
      "id": "81e88b40-b16a-4619-a659-2881ea326217",
      "config": {
        "colour": COLOR,
        "foregroundColour": "#FFFFFF"
      }
    },
    {
      "id": "9545852c-d64a-457a-8ca0-2b2d1173de9b",
      "config": {
        "url": "https://cdn.sticky.to/application-blocks/used/loyverse--copy-access-token.png",
        "dropShadow": false,
        "corners": "Rounded corners",
        "specialEffect": "None",
        "goToUrl": ""
      }
    },
    {
      "id": "71d05208-3781-4c24-996e-c4c0d1c6b228",
      "config": {
        "what": "Copy the access token.\n\nPaste it into Sticky form field:\n\n<strong>PASTE HERE: Access token</strong>",
        "font": "#202058--center--100%--false",
        "backgroundColour": "#ffffff",
        "icon": ""
      }
    },
    {
      "id": "81e88b40-b16a-4619-a659-2881ea326217",
      "config": {
        "colour": COLOR,
        "foregroundColour": "#FFFFFF"
      }
    },
    {
      "id": "9545852c-d64a-457a-8ca0-2b2d1173de9b",
      "config": {
        "url": "https://cdn.sticky.to/application-blocks/used/loyverse--get-name-of-store.png",
        "dropShadow": false,
        "corners": "Rounded corners",
        "specialEffect": "None",
        "goToUrl": ""
      }
    },
    {
      "id": "a21eddf2-aa86-4b6a-a2af-8ac279b246f7",
      "config": {
        "action": "url~~||~~https://r.loyverse.com/dashboard/#/settings/outlets~~||~~false",
        "label": "Go to Loyverse stores",
        "colour": "#F3F5F7",
        "foregroundColour": "#202058",
        "icon": "",
        "fullWidth": false
      }
    },
    {
      "id": "71d05208-3781-4c24-996e-c4c0d1c6b228",
      "config": {
        "what": "Copy a store name.\n\nPaste it into Sticky form field:\n\n<strong>PASTE HERE: Store name</strong>",
        "font": "#202058--center--100%--false",
        "backgroundColour": "#ffffff",
        "icon": ""
      }
    }
  ],
  // crons: [
  //   {
  //     id: 'generic',
  //     frequency: '*/5 * * * *',
  //     logic: async function (user, cronContainer) {
  //       let nextIP = 0
  //       let nextIPc = 0
  //       const { rdic } = cronContainer
  //       global.rdic.logger.log({}, '[job-CONNECTION_LOYALVERSE] [go]', { userId: user.id })


  //       try {
  //         const { config } = user.connections.find(c => c.id === 'CONNECTION_LOYALVERSE')
  //         let [configApiKey] = config

  //         assert(typeof configApiKey === 'string' && configApiKey.length > 0, 'You have not set an API key.')

  //         const theirStore = await getStore(config)
  //         const theirCategories = await getCategories(config)
  //         const theirItems = await getItems(config, theirStore)

  //         theirItems.forEach(item => {
  //           const foundCategory = theirCategories.find(pc => pc.id === item._.categoryId)
  //           foundCategory && foundCategory.products.push(item.id)
  //         })

  //         const finalPList = []
  //         const allPcsToday = await cronContainer.getProductCategories(rdic, user, { connection: 'CONNECTION_LOYALVERSE' })
  //         const allPsToday = await cronContainer.getProducts(rdic, user, { connection: 'CONNECTION_LOYALVERSE' })

  //         let handledPcs = [], handledPs = []

  //         for (let productI = 0; productI < theirItems.length; productI++) {
  //           const theirP = theirItems[productI]
  //           let foundExistingP = allPsToday.find(maybeExistingP => maybeExistingP.theirId === theirP.id)

  //           global.rdic.logger.log({}, '[job-CONNECTION_LOYALVERSE] [go]', theirP.name)
  //           if (foundExistingP) {
  //             foundExistingP.patch(theirP)
  //             await cronContainer.updateProduct(foundExistingP)
  //             handledPs.push(foundExistingP.id)
  //             finalPList.push({
  //               ...theirP,
  //               id: foundExistingP.id
  //             })
  //           } else {
  //             const payload = {
  //               ...theirP,
  //               userId: user.id,
  //               theirId: theirP.id,
  //               createdAt: getNow() + nextIP,
  //               connection: 'CONNECTION_LOYALVERSE',
  //               currency: user.currency
  //             }
  //             const createdId = (await cronContainer.createProduct({
  //               ...payload,
  //               id: undefined
  //             })).id
  //             finalPList.push({
  //               ...payload,
  //               id: createdId
  //             })
  //           }
  //           nextIP++
  //         }

  //         for (let categoryI = 0; categoryI < theirCategories.length; categoryI++) {
  //           const theirPc = theirCategories[categoryI]
  //           let foundExistingPc = allPcsToday.find(maybeExistingPc => maybeExistingPc.theirId === theirPc.id)
  //           global.rdic.logger.log({}, '[job-CONNECTION_LOYALVERSE] [go]', theirPc.name)

  //           if (foundExistingPc) {
  //             foundExistingPc.name = theirPc.name
  //             foundExistingPc.color = theirPc.color
  //             foundExistingPc.products.clear()
  //             finalPList
  //               .filter(ti => ti._.categoryId === foundExistingPc.theirId)
  //               .forEach(ti => {
  //                 foundExistingPc.products.add(ti.id)
  //               })
  //             foundExistingPc.view = 'grid-name'
  //             await cronContainer.updateProductCategory(foundExistingPc)
  //             handledPcs.push(foundExistingPc.id)
  //           } else {
  //             foundExistingPc = await cronContainer.createProductCategory(
  //               {
  //                 userId: user.id,
  //                 name: theirPc.name,
  //                 color: theirPc.color,
  //                 theirId: theirPc.id,
  //                 createdAt: getNow() + nextIPc,
  //                 connection: 'CONNECTION_LOYALVERSE',
  //                 view: 'grid-name',
  //                 products: (() => {
  //                   const toReturn = finalPList
  //                     .filter(ti => ti._.categoryId === theirPc.id)
  //                     .map(ti => ti.id)
  //                   return toReturn
  //                 })()
  //               },
  //               user
  //             )
  //             nextIPc++
  //           }
  //         }

  //         const toDeletePcPromises = allPcsToday
  //           .filter(pc => !handledPcs.includes(pc.id))
  //           .map(pc => rdic.get('datalayerRelational').deleteOne('product_categories', pc.id))
  //         global.rdic.logger.log({}, '[job-CONNECTION_LOYALVERSE] handledPcs', handledPcs)
  //         global.rdic.logger.log({}, '[job-CONNECTION_LOYALVERSE] toDeletePcPromises.length', toDeletePcPromises.length)
  //         await Promise.all(toDeletePcPromises)

  //         const toDeletePPromises = allPsToday
  //           .filter(p => !handledPs.includes(p.id))
  //           .map(async p => {
  //             await rdic.get('datalayerRelational').deleteOne('products', p.id)
  //             await rdic.get('datalayerRelational')._.sql(`UPDATE things SET product_id=NULL WHERE product_id='${p.id}' AND user_id='${user.id}'`)
  //           })
  //         global.rdic.logger.log({}, '[job-CONNECTION_LOYALVERSE] handledPs.length', handledPs.length)
  //         global.rdic.logger.log({}, '[job-CONNECTION_LOYALVERSE] toDeletePPromises.length', toDeletePPromises.length)
  //         await Promise.all(toDeletePPromises)

  //       } catch ({ message }) {
  //         const payload = {
  //           type: 'CONNECTION_BAD',
  //           userId: user.id,
  //           customData: { id: 'CONNECTION_LOYALVERSE', message }
  //         }
  //         await cronContainer.createEvent(payload)
  //         global.rdic.logger.error({}, { message })
  //       }
  //     }
  //   }
  // ]
})
