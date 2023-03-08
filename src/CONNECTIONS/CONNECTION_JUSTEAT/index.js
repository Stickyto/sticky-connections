/* eslint-disable max-len */
/* eslint-disable quotes */
const Connection = require('../Connection')
const importMenu = require('./importMenu')

module.exports = new Connection({
  id: 'CONNECTION_JUSTEAT',
  name: 'Just Eat',
  color: '#FF8001',
  logo: cdn => `${cdn}/connections/CONNECTION_JUSTEAT.png`,
  configNames: ['URL'],
  configDefaults: [''],
  methods: {
    importMenu: {
      name: 'Import Menu',
      logic: async ({ config }) => {
        const [url] = config
        const menu = await importMenu(url)
        return {
          url,
          menu
        }
      }
    }
  }
})
