/* eslint-disable max-len */
const { assert, getNow } = require('openbox-node-utils')
const { Question } = require('openbox-entities')

const allDeliverectProductTags = [
  {
    'name': 'Alcohol',
    'allergenId': 1,
    ourTag: 'wet--alcohol'
  },
  {
    'name': 'Halal',
    'allergenId': 2,
    ourTag: 'halal'
  },
  {
    'name': 'Kosher',
    'allergenId': 3,
    ourTag: 'kosher'
  },
  {
    'name': 'Vegan',
    'allergenId': 4,
    ourTag: 'vegan'
  },
  {
    'name': 'Vegetarian',
    'allergenId': 5,
    ourTag: 'vegetarian'
  },
  {
    'name': 'Celery',
    'allergenId': 100,
    ourTag: 'allergy--celery'
  },
  {
    'name': 'Gluten',
    'allergenId': 101,
    ourTag: 'allergy--gluten'
  },
  {
    'name': 'Crustaceans',
    'allergenId': 102,
    ourTag: 'allergy--crustaceans'
  },
  {
    'name': 'Fish',
    'allergenId': 103,
    ourTag: 'allergy--fish'
  },
  {
    'name': 'Eggs',
    'allergenId': 104,
    ourTag: 'allergy--eggs'
  },
  {
    'name': 'Lupin',
    'allergenId': 105,
    ourTag: 'allergy--lupin'
  },
  {
    'name': 'Milk',
    'allergenId': 106,
    ourTag: 'allergy--milk'
  },
  {
    'name': 'Molluscs',
    'allergenId': 107,
    ourTag: 'allergy--molluscs'
  },
  {
    'name': 'Mustard',
    'allergenId': 108,
    ourTag: 'allergy--mustard',
  },
  {
    'name': 'Nuts',
    'allergenId': 109,
    ourTag: 'allergy--nuts',
  },
  {
    'name': 'Sesame',
    'allergenId': 111,
    ourTag: 'allergy--sesame',
  },
  {
    'name': 'Soya',
    'allergenId': 112,
    ourTag: 'allergy--soy',
  },
  {
    'name': 'Sulphites',
    'allergenId': 113,
    ourTag: 'allergy--sulphites',
  },
  {
    'name': 'Gluten Free',
    'allergenId': 1101,
    ourTag: 'gluten-free',
  },
  {
    'name': 'Peanuts',
    'allergenId': 110,
    ourTag: 'allergy--nuts' // subset
  },
  {
    'name': 'Almonds',
    'allergenId': 114,
    ourTag: 'allergy--nuts' // subset
  },
  {
    'name': 'Brazil Nuts',
    'allergenId': 116,
    ourTag: 'allergy--nuts' // subset
  },
  {
    'name': 'Cashew',
    'allergenId': 117,
    ourTag: 'allergy--nuts' // subset
  },
  {
    'name': 'Hazelnuts',
    'allergenId': 118,
    ourTag: 'allergy--nuts' // subset
  },
  {
    'name': 'Macadamia',
    'allergenId': 120,
    ourTag: 'allergy--nuts' // subset
  },
  {
    'name': 'Pecan',
    'allergenId': 122,
    ourTag: 'allergy--nuts' // subset
  },
  {
    'name': 'Pistachios',
    'allergenId': 123,
    ourTag: 'allergy--nuts' // subset
  },
  {
    'name': 'Walnuts',
    'allergenId': 126,
    ourTag: 'allergy--nuts' // subset
  },
  {
    'name': 'Dairy',
    'allergenId': 129,
    ourTag: 'allergy--milk' // subset
  },
  {
    'name': 'Can Serve Alone',
    'allergenId': 6
  },
  {
    'name': 'Bottle Deposit',
    'allergenId': 7
  },
  {
    'name': 'Organic',
    'allergenId': 8
  },
  {
    'name': 'Natural',
    'allergenId': 9
  },
  {
    'name': 'Barley',
    'allergenId': 115
  },
  {
    'name': 'Kamut',
    'allergenId': 119
  },
  {
    'name': 'Oats',
    'allergenId': 121
  },
  {
    'name': 'Rye',
    'allergenId': 124
  },
  {
    'name': 'Spelt',
    'allergenId': 125
  },
  {
    'name': 'Wheat',
    'allergenId': 127
  },
  {
    'name': 'Sugared Drink',
    'allergenId': 128
  },
  {
    'name': 'No Allergens',
    'allergenId': 1000
  },
  {
    'name': 'Sugar Free',
    'allergenId': 1128
  },
  {
    'name': 'Lac Free',
    'allergenId': 1129
  }
]

const dayBs = new Map([
  [1, 0],
  [2, 1],
  [3, 2],
  [4, 3],
  [5, 4],
  [6, 5],
  [7, 6]
])

function parseTheirTime (_, user) {
  const [HH, MM] = _.split(':')
  assert([HH, MM].every(__ => typeof __ === 'string' && __.length === 2 && !isNaN(parseInt(__, 0))), 'parsed time component is not valid')
  return Math.ceil((parseInt(HH, 10) * 60) + parseInt(MM, 10) - (user.timezone / 60))
}

function getNiceAvailability (availability, user) {
  const day = dayBs.get(availability.dayOfWeek)
  assert(typeof day === 'number', '[inboundMenu] [getNiceAvailability] day is not correct')
  return {
    day: dayBs.get(availability.dayOfWeek),
    startTime: parseTheirTime(availability.startTime, user),
    endTime: parseTheirTime(availability.endTime, user)
  }
}

function getPMedia (theirP) {
  return theirP.imageUrl ? [{ type: 'image', url: theirP.imageUrl }] : []
}

function getPQuestions (theirP, modifierGroups, modifiers) {
  return theirP.subProducts.map(sp => {
    const foundMg = modifierGroups[sp]
    const options = foundMg.subProducts.map(sp2 => {
      const foundM = modifiers[sp2]
      return {
        name: foundM.name.trim(),
        delta: foundM.price,
        media: getPMedia(foundM),
        description: foundM.description.trim(),
        theirId: foundM.plu
      }
    })
    const answer = options.length > 0 ? options[0].name : ''
    return {
      type: 'option',
      theirId: foundMg.plu,
      question: foundMg.name.endsWith('?') ? foundMg.name : `${foundMg.name}?`,
      answer,
      options
    }
  })
}

function getPTags (array) {
  return array
    .map(_ => allDeliverectProductTags.find(__ => __.allergenId === _ && __.ourTag))
    .filter(_ => _)
    .map(_ => _.ourTag)
}

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
    const { availabilities, channelLinkId, categories: theirCategories, products: theirProducts, modifierGroups, modifiers } = body[0]

    let [configuredChannelLinkId] = config
    try {
      assert(channelLinkId === configuredChannelLinkId, `[inboundMenu] Channel link IDs do not match (${channelLinkId} vs configured ${configuredChannelLinkId})`)

      const allPcTimes = availabilities.map(_ => getNiceAvailability(_, user))

      const allPcsTimesDelta = allPcTimes.length > 0 && {
        days: Array.from(new Set(allPcTimes.map(_ => _.day))),
        startAt: Math.min(...allPcTimes.map(_ => _.startTime)),
        endAt: Math.max(...allPcTimes.map(_ => _.endTime))
      }
      if (allPcsTimesDelta) {
        const toSet = `days = '{${allPcsTimesDelta.days.join(', ')}}', start_at = ${allPcsTimesDelta.startAt}, end_at = ${allPcsTimesDelta.endAt}`
        global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [inboundMenu]', { allPcTimes, allPcsTimesDelta, toSet })
        await rdic.get('datalayerRelational').updateMany('product_categories', { user_id: user.id, connection: 'CONNECTION_DELIVERECT' }, toSet)
      }

      let nextIPc = 0
      let nextIP = 0

      const pLog = new Map()

      const allProductTags = getPTags(body[0].productTags)

      global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [inboundMenu]', { allProductTags })

      const allPcsToday = await getProductCategories(rdic, user, 'CONNECTION_DELIVERECT')
      const allPsToday = await getProducts(rdic, user, 'CONNECTION_DELIVERECT')

      const productsIds = Object.keys(theirProducts)
      const howManyPs = productsIds.length
      for (let productI = 0; productI < howManyPs; productI++) {
        const theirP = theirProducts[productsIds[productI]]
        let foundExistingP = allPsToday.find(maybeExistingP => maybeExistingP.theirId === theirP.plu)

        global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [go]', theirP.name)
        if (foundExistingP) {
          foundExistingP.name = theirP.name.trim()
          foundExistingP.description = theirP.description.trim()
          foundExistingP.updatedAt = getNow()
          foundExistingP.currency = theirP.currency
          foundExistingP.price = theirP.price
          foundExistingP.isEnabled = !theirP.snoozed
          foundExistingP.media = getPMedia(theirP)
          foundExistingP.questions = getPQuestions(theirP, modifierGroups, modifiers).map(q => new Question(q))
          foundExistingP.categories.patch(allProductTags)
          pLog.set(theirP._id, foundExistingP.id)
          await updateProduct(foundExistingP)
        } else {
          const payload = {
            userId: user.id,
            theirId: theirP.plu,
            createdAt: getNow() + nextIP,
            connection: 'CONNECTION_DELIVERECT',
            currency: user.currency,
            price: theirP.price,
            name: theirP.name.trim(),
            description: theirP.description.trim(),
            isEnabled: !theirP.snoozed,
            media: getPMedia(theirP),
            questions: getPQuestions(theirP, modifierGroups, modifiers),
            categories: Array.from(new Set([...allProductTags, ...getPTags(theirP.productTags)]))
          }
          const createdId = (await createProduct({
            ...payload,
            id: undefined
          })).id
          pLog.set(theirP._id, createdId)
        }
        nextIP++
      }

      for (let categoryI = 0; categoryI < theirCategories.length; categoryI++) {
        const theirPc = theirCategories[categoryI]
        let foundExistingPc = allPcsToday.find(maybeExistingPc => maybeExistingPc.theirId === theirPc._id)
        global.rdic.logger.log({}, '[CONNECTION_DELIVERECT] [go]', theirPc.name)
        const pcTimes = theirPc.availabilities.map(_ => getNiceAvailability(_, user))
        const pcTimesContainer = pcTimes.length > 0 && {
          days: Array.from(new Set(pcTimes.map(_ => _.day))),
          startAt: Math.min(...pcTimes.map(_ => _.startTime)),
          endAt: Math.max(...pcTimes.map(_ => _.endTime))
        }

        if (foundExistingPc) {
          foundExistingPc.name = theirPc.name.trim()
          foundExistingPc.description = theirPc.description.trim()
          foundExistingPc.updatedAt = getNow()
          foundExistingPc.products.clear()
          theirPc.products
            .map(p => pLog.get(p))
            .filter(_ => _)
            .forEach(p => {
              foundExistingPc.products.add(p)
            })
          foundExistingPc.alwaysAt = false
          if (allPcsTimesDelta) {
            foundExistingPc.days = allPcsTimesDelta.days
            foundExistingPc.startAt = allPcsTimesDelta.startAt
            foundExistingPc.endAt = allPcsTimesDelta.endAt
          }
          if (pcTimesContainer) {
            foundExistingPc.days = pcTimesContainer.days
            foundExistingPc.startAt = pcTimesContainer.startAt
            foundExistingPc.endAt = pcTimesContainer.endAt
          }
          await updateProductCategory(foundExistingPc)

        } else {
          let payload = {
            userId: user.id,
            name: theirPc.name,
            description: theirPc.description,
            theirId: theirPc._id,
            createdAt: getNow() + nextIPc,
            connection: 'CONNECTION_DELIVERECT',
            view: 'grid-name',
            alwaysAt: false,
            products: theirPc.products
              .map(p => pLog.get(p))
              .filter(_ => _)
          }
          if (allPcsTimesDelta) {
            payload = {
              ...payload,
              ...allPcsTimesDelta
            }
          }
          if (pcTimesContainer) {
            payload = {
              ...payload,
              ...pcTimesContainer
            }
          }
          foundExistingPc = await createProductCategory(payload, user)
          nextIPc++
        }
      }

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
