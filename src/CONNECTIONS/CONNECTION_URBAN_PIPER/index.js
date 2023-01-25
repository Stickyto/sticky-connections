const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_URBAN_PIPER',
  name: 'UrbanPiper',
  color: '#6311f4',
  logo: cdn => `${cdn}/connections/CONNECTION_URBAN_PIPER.svg`,
  configNames: [],
  configDefaults: [],
  methods: {
    menuIntegration: {
      name: 'menuIntegration',
      logic: async ({ connectionContainer, config, body }) => ({ method: 'menuIntegration' })
    },
    itemInventory: {
      name: 'itemInventory',
      logic: async ({ connectionContainer, config, body }) => ({ method: 'itemInventory' })
    },
    orderStatusExchange: {
      name: 'orderStatusExchange',
      logic: async ({ connectionContainer, config, body }) => ({ method: 'orderStatusExchange' })
    },
    storeToggle: {
      name: 'storeToggle',
      logic: async ({ connectionContainer, config, body }) => ({ method: 'storeToggle' })
    }
  },
  instructions: [
    {
      'id': '9545852c-d64a-457a-8ca0-2b2d1173de9b',
      'config': {
        'url': 'https://cdn.sticky.to/connections/CONNECTION_URBAN_PIPER.svg',
        'dropShadow': false,
        'corners': 'Square',
        'specialEffect': 'None',
        'goToUrl': ''
      }
    },
    {
      'id': '71d05208-3781-4c24-996e-c4c0d1c6b228',
      'config': {
        'what': 'UrbanPiper is coming soon. Hold on tight!',
        'font': '#6311f4--center--100%--false',
        'backgroundColour': '#ffffff',
        'icon': ''
      }
    }
  ]
})
