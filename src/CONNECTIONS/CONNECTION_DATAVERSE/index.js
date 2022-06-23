const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_DATAVERSE',
  name: 'Dataverse',
  shortName: 'D',
  color: '#0078d4',
  logo: cdn => `${cdn}/connections/CONNECTION_DATAVERSE.svg`,
  configNames: ['URL', 'Client ID', 'Client secret', 'Version'],
  configDefaults: ['https://xyz.api.crm11.dynamics.com', '', '', '9.2'],
  instructionsDone: 'Form submissions will now go into Microsoft Dataverse. Update each "Form → Text box" flow step with a map to the right Microsoft Dataverse field name.'
})
