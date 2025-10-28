/* eslint-disable max-len */
/* eslint-disable quotes */
const safeEval = require('safe-eval')
const { sum, assert } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')
const makeRequest = require('./makeRequest')

async function eventHookLogic (config, connectionContainer) {
  const { user, application, thing, payment, customData, createEvent } = connectionContainer

  const [configForestGardenId, configMustMatchProductName, configApiEndpoint, configApiToken] = config

  const howMany = sum(
    customData.cart
      .filter(_ => {
        return (_.productName.indexOf(configMustMatchProductName) !== -1)
      })
      .map(_ => _.quantity)
  )
  global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN]', { configForestGardenId, configMustMatchProductName, configApiEndpoint, configApiToken, howMany })

  if (howMany > 0) {
    const body = {
      quantity: howMany,
      productCode: 'PLAY1TREEAPI',
      referenceNo: payment.id
    }
    global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] howMany > 0', { body })
    try {
      global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] exec 1')
      const { productInOrderId: theirId1, orderId: theirId2 } = await makeRequest(
        configApiToken,
        'post',
        `${configApiEndpoint}/pig2/api/buy_trees`,
        body,
        'json'
      )
      global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] exec 2', { theirId1, theirId2 })
      createEvent({
        type: 'CONNECTION_GOOD',
        userId: user.id,
        applicationId: application ? application.id : undefined,
        thingId: thing ? thing.id : undefined,
        customData: { id: 'CONNECTION_PLAY_IT_GREEN', theirId: theirId1 }
      })
    } catch (e) {
      createEvent({
        type: 'CONNECTION_BAD',
        userId: user.id,
        applicationId: application ? application.id : undefined,
        customData: { id: 'CONNECTION_PLAY_IT_GREEN', message: e.message }
      })
    }
  }
}

module.exports = new Connection({
  id: 'CONNECTION_PLAY_IT_GREEN',
  name: 'Play It Green',
  color: '#5CC239',
  logo: cdn => `${cdn}/connections/CONNECTION_PLAY_IT_GREEN.png`,
  configNames: ['(Optional) Forest Garden ID', 'Match products with a name containing', 'API endpoint', 'API token'],
  configDefaults: ['431', 'Play It Green', 'https://api.playitgreen.com', ''],
  methods: {
    getForestGarden: {
      name: 'Get Forest Garden',
      logic: async ({ config }) => {
        const [configForestGardenId, , configApiEndpoint] = config
        const url = `${configApiEndpoint}/pig2/widget/garden/${configForestGardenId}`
        const r = await makeRequest(undefined, 'get', url, undefined, 'text')
        let asObject
        try {
          assert(r)
          const asString = r.substring('const model = '.length, r.indexOf('window.onload'))
          asObject = safeEval(asString)
        } catch (e) {
          throw new Error(`There isn't a Forest Garden with ID "${configForestGardenId}".`)
        }
        return {
          meta: {
            name: asObject.gardenName,
            link: asObject.gardenLink,
          },
          statistics: {
            trees: asObject.gardenStats.trees,
            co2: asObject.gardenStats.co2,
            goodCause: asObject.gardenStats.goodCause,
            climateAction: asObject.gardenStats.climateAction
          }
        }
      }
    }
  },
  eventHooks: {
    'SESSION_CART_PAY': eventHookLogic
  },
  instructions: ({ rdic, user, applications }) => [
    {
      "id": "9545852c-d64a-457a-8ca0-2b2d1173de9b",
      "config": {
        "url": "https://cdn.sticky.to/connections/CONNECTION_PLAY_IT_GREEN/logo.png",
        "dropShadow": false,
        "corners": "Square",
        "specialEffect": "None",
        "goToUrl": ""
      }
    },
    {
      "id": "71d05208-3781-4c24-996e-c4c0d1c6b228",
      "config": {
        "what": "You can get your <strong>Forest Garden ID</strong> from the end of the \"iframe grab\" URL:",
        "font": "#5CC239--center--100%--false",
        "backgroundColour": "#ffffff",
        "icon": ""
      }
    },
    {
      "id": "71d05208-3781-4c24-996e-c4c0d1c6b228",
      "config": {
        "what": "api.playitgreen.com/pig2/widget/garden/<strong>[ID]</strong>",
        "font": "#202058--center--100%--true",
        "backgroundColour": "#ffffff",
        "icon": ""
      }
    }
  ]
})
