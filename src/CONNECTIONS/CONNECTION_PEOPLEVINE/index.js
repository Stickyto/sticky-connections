const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_PEOPLEVINE',
  type: 'CONNECTION_TYPE_ERP',
  name: 'Peoplevine',
  color: '#CF8516',
  logo: cdn => `${cdn}/connections/CONNECTION_PEOPLEVINE.svg`,
  configNames: [],
  configDefaults: [],
  methods: {
    verify: {
      name: 'Verify',
      logic: async ({ connectionContainer, config, body }) => {
        if (body.number === '12749' && body.name.trim().toLowerCase() === 'patrick') {
          return {
            name: 'Patrick'
          }
        }
        if (body.number === '22503' && body.name.trim().toLowerCase() === 'darren') {
          return {
            name: 'Darren'
          }
        }
        throw new Error(`Membership number ${body.number} isn't right - sorry.`)
        // Valid with unknown name: #15010
        // Wrong: #17065
      }
    }
  }
})
