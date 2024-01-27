/* eslint-disable max-len */
const { Firestore } = require('@google-cloud/firestore')
const { assert } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')

function getFirestore (config) {
  const [configServiceAccountJsonAsString] = config
  const configServiceAccount = JSON.parse(configServiceAccountJsonAsString)
  assert(configServiceAccount.project_id, '"Service account JSON" does not contain a project_id!')
  return new Firestore({
    projectId: configServiceAccount.project_id,
    credentials: configServiceAccount
  })
}

async function getLocations (firestore) {
  const query = firestore.collection('locations')
  const querySnapshot = await query.get()
  return querySnapshot.docs.map(_ => {
    const __ = _.data()
    return { id: 'turbine_centre', name: __.name || __.company, countSpaces: __.spaces }
  })
}

async function getSpaces (firestore, { location }) {
  var query = firestore.collection(`locations/${location}/spaces`)
  const querySnapshot = await query.get()
  return querySnapshot.docs.map(_ => {
    const __ = _.data()
    return {
      id: __.beacon.id,
      price: Math.floor(parseFloat(__.parking_price.substring(1)) * 100),
      isOccupied: __.occupied,
      isElectricOnly: __.electric_only,
      isDisabled: __.disabled,
      location: {
        lat: __.location._latitude,
        long:__.location._longitude
      }
    }
  })
}

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
        const firestore = getFirestore(config)
        const locations = await getLocations(firestore)
        return locations
      }
    },
    getSpaces: {
      name: 'Get spaces',
      logic: async ({ connectionContainer, config, body }) => {
        const { location } = body
        const firestore = getFirestore(config)
        const locations = await getSpaces(firestore, { location })
        return locations
      }
    }
  }
})

// await sticky.internals.trigger('public--connections-go', { id: 'CONNECTION_BLUE_MESH', method: 'getLocations', body: {} });

// await sticky.internals.trigger('public--connections-go', { id: 'CONNECTION_BLUE_MESH', method: 'getSpaces', body: { location: 'turbine_centre' } });
