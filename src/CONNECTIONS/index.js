const CONNECTIONS = new Map([
  [
    'CONNECTION_CALENDLY',
    require('./CONNECTION_CALENDLY')
  ],
  [
    'CONNECTION_LOYALVERSE',
    require('./CONNECTION_LOYALVERSE')
  ],
  [
    'CONNECTION_UNTAPPD',
    require('./CONNECTION_UNTAPPD')
  ],
  [
    'CONNECTION_DATAVERSE',
    require('./CONNECTION_DATAVERSE')
  ],
  [
    'CONNECTION_ATREEMO',
    require('./CONNECTION_ATREEMO')
  ],
  [
    'CONNECTION_DELIVERECT',
    require('./CONNECTION_DELIVERECT')
  ],
  [
    'CONNECTION_ELITE_DYNAMICS',
    require('./CONNECTION_ELITE_DYNAMICS')
  ],
  [
    'CONNECTION_API',
    require('./CONNECTION_API')
  ]
])

module.exports = CONNECTIONS
