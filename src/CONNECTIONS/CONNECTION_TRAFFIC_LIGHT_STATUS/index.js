const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_TRAFFIC_LIGHT_STATUS',
  name: 'Traffic Light Status',
  type: 'CONNECTION_TYPE_ERP',
  partnerNames: ['Traffic Light Status', 'Compass Group'],
  color: '#1e272e',
  logo: cdn => `${cdn}/connections/CONNECTION_TRAFFIC_LIGHT_STATUS.svg`,
  configNames: ['Systems (comma separated KAPPTURE/BRISK/LINNEY/BOXBAR/STICKY/LEVY)'],
  configDefaults: ['']
})
