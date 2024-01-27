/* eslint-disable max-len */
const { assert } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_BLUE_MESH',
  name: 'Blue Mesh',
  color: '#48577D',
  logo: cdn => `${cdn}/connections/CONNECTION_BLUE_MESH.svg`,
  partnerNames: ['Blue Mesh'],
  configNames: [
    'Service account JSON'
  ],
  configDefaults: [
    '{}'
  ],
  methods: {
    getLocations: {
      name: 'Get locations',
      logic: async ({ connectionContainer, config, body }) => {
        return [{}, {}, {}]
      }
    }
  }
})
