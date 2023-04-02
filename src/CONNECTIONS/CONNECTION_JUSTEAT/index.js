/* eslint-disable max-len */
/* eslint-disable quotes */
const Connection = require('../Connection')
const importMenu = require('./importMenu')
const { assert, isUrl } = require('openbox-node-utils')

module.exports = new Connection({
  id: 'CONNECTION_JUSTEAT',
  name: 'Just Eat',
  color: '#FF8001',
  logo: cdn => `${cdn}/connections/CONNECTION_JUSTEAT.svg`,
  logoInverted: cdn => `${cdn}/connections/CONNECTION_JUSTEAT_WHITE.svg`,
  configNames: ['URL'],
  configDefaults: [''],
  userIds: ['32027163-655c-4881-9bba-780dc0243865'],
  methods: {
    importMenu: {
      name: 'Import Menu',
      logic: async ({ config }) => {
        const [url] = config

        assert(isUrl(url), "Please provide your Just Eat menu URL.")

        const menu = await importMenu(url)

        return {
          url,
          menu
        }
      }
    }
  }
})
