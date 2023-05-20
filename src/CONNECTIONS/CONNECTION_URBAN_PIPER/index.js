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
      // {"publicKey":"public-41b5b3d3-6ef3-4500-bd69-d78e909ff8de","body":{"add_ons":[],"in_stock":true,"variants":[],"location_ref_id":"42615","items":["4427109"]},"connection":"CONNECTION_URBAN_PIPER","method":"itemInventory"}
    },
    orderStatusExchange: {
      name: 'orderStatusExchange',
      logic: async ({ connectionContainer, config, body }) => ({ method: 'orderStatusExchange' })
    },
    storeToggle: {
      name: 'storeToggle',
      logic: async ({ connectionContainer, config, body }) => ({ method: 'storeToggle' })
      // {"publicKey":"public-41b5b3d3-6ef3-4500-bd69-d78e909ff8de","body":{"ordering_enabled":false,"location_ref_id":"42638"},"connection":"CONNECTION_URBAN_PIPER","method":"storeToggle"}
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
