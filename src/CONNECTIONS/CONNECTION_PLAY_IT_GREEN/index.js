/* eslint-disable max-len */
/* eslint-disable quotes */
const safeEval = require('safe-eval')
const { sum, assert } = require('openbox-node-utils')
const Connection = require('../Connection')
const makeRequest = require('./makeRequest')

async function eventHookLogic(config, connectionContainer) {
  const { user, application, thing, customData, createEvent } = connectionContainer

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
    try {
      const { productInOrderId: theirId } = await makeRequest(
        configApiToken,
        'post',
        `${configApiEndpoint}/pig2/api/buy_trees`,
        {
          quantity: howMany
        },
        'json'
      )
      createEvent({
        type: 'CONNECTION_GOOD',
        userId: user.id,
        applicationId: application ? application.id : undefined,
        thingId: thing ? thing.id : undefined,
        customData: { id: 'CONNECTION_PLAY_IT_GREEN', theirId }
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
  configNames: ['Forest Garden ID', 'Match products with a name containing', 'API endpoint', 'API token'],
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
  instructions: [
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
        "font": "#1A1F35--center--100%--true",
        "backgroundColour": "#ffffff",
        "icon": ""
      }
    },
    {
      "id": "71d05208-3781-4c24-996e-c4c0d1c6b228",
      "config": {
        "what": "Play It Green plants a tree for every product bought that fits the 'Match products with a name containing' box. This box is case sensitive.\n\nFor example, if you set up a product called <strong>Save the planet (important)</strong>, type <strong>Save the planet</strong> in the box.",
        "font": "#5CC239--center--100%--false",
        "backgroundColour": "#ffffff",
        "icon": ""
      }
    },
    {
      'id': 'd7e4ecf2-4886-4423-885d-2bb059494953',
      'config': {}
    },
    {
      'id': 'eab1198f-f924-442c-90d7-fca408ee9ef8',
      'config': {
        'colour': '#5CC239',
        'what': 'New to Play It Green?'
      }
    },
    {
      "id": "71d05208-3781-4c24-996e-c4c0d1c6b228",
      "config": {
        "what": "Make your workforce climate positive, reduce your business footprint and take your next step to net zero.",
        "font": "#5CC239--center--100%--false",
        "backgroundColour": "#ffffff"
      }
    },
    {
      'id': '0e1f0565-5e05-471c-b855-bbe44c20527d',
      'config': {
        'label': 'Name',
        'type': 'Consumer → Name'
      }
    },
    {
      'id': '0e1f0565-5e05-471c-b855-bbe44c20527d',
      'config': {
        'label': 'Email',
        'type': 'Consumer → Email'
      }
    },
    {
      'id': '0e1f0565-5e05-471c-b855-bbe44c20527d',
      'config': {
        'label': 'Phone',
        'type': 'Consumer → Phone'
      }
    },
    {
      'id': 'a21eddf2-aa86-4b6a-a2af-8ac279b246f7',
      'config': {
        'action': 'formSubmitPartner~~||~~',
        'label': 'Send to Play It Green',
        'colour': '#f69e05',
        'foregroundColour': '#FFFFFF',
        'icon': 'check',
        'fullWidth': false
      }
    }
  ]
})
