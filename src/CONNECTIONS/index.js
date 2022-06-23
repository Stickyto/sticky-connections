const CONNECTIONS = new Map([
  [
    'CONNECTION_CALENDLY',
    require('./CONNECTION_CALENDLY')
  ],
  [
    'CONNECTION_ELITE_DYNAMICS',
    require('./CONNECTION_ELITE_DYNAMICS')
  ],
  [
    'CONNECTION_UNTAPPD',
    require('./CONNECTION_UNTAPPD')
  ],
  [
    'CONNECTION_LOYALVERSE',
    require('./CONNECTION_LOYALVERSE')
  ],
  [
    'CONNECTION_DATAVERSE',
    require('./CONNECTION_DATAVERSE')
  ]
])

module.exports = CONNECTIONS
