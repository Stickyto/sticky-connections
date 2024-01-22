const { assert } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')
const makeRequest = require('./makeRequest')

const API_URL = 'https://driver-vehicle-licensing.api.gov.uk'

module.exports = new Connection({
  id: 'CONNECTION_DVLA',
  name: 'DVLA',
  color: '#006F5F',
  logo: cdn => `${cdn}/connections/CONNECTION_DVLA.svg`,
  configNames: ['API key'],
  configDefaults: [''],
  userIds: ['0b856f3b-030a-41b1-8434-396fc79f10ed'],
  methods: {
    getVrn: {
      name: 'Get VRN',
      logic: async ({ config, body }) => {
        let { vrn } = body
        assert(typeof vrn === 'string', 'vrn key must be a string!')
        vrn = vrn.toUpperCase().trim()
        const [configApiKey] = config
        const url = `${API_URL}/vehicle-enquiry/v1/vehicles`
        const r = await makeRequest(configApiKey, 'post', url, { registrationNumber: vrn })
        return {
          vrn: r.registrationNumber,
          engineCapacity: r.engineCapacity,
          make: r.make,
          fuelType: r.fuelType,
          co2Emissions: r.co2Emissions
        }
      }
    }
  }
})

// EV
// {
//   "registrationNumber": "ECZ868",
//   "taxStatus": "Taxed",
//   "taxDueDate": "2024-08-01",
//   "motStatus": "Not valid",
//   "make": "RENAULT",
//   "yearOfManufacture": 2016,
//   "engineCapacity": 0,
//   "co2Emissions": 0,
//   "fuelType": "ELECTRICITY",
//   "markedForExport": true,
//   "colour": "GREY",
//   "typeApproval": "M1",
//   "revenueWeight": 1949,
//   "dateOfLastV5CIssued": "2023-07-06",
//   "motExpiryDate": "2024-01-08",
//   "wheelplan": "2 AXLE RIGID BODY",
//   "monthOfFirstRegistration": "2016-01"
// }

// NON EV (VERY BAD)
// {
//   "registrationNumber": "D427ODB",
//   "taxStatus": "Taxed",
//   "taxDueDate": "2024-04-01",
//   "motStatus": "Valid",
//   "make": "TOYOTA",
//   "yearOfManufacture": 1987,
//   "engineCapacity": 1587,
//   "fuelType": "PETROL",
//   "markedForExport": false,
//   "colour": "RED",
//   "dateOfLastV5CIssued": "2023-11-03",
//   "motExpiryDate": "2024-05-26",
//   "wheelplan": "2 AXLE RIGID BODY",
//   "monthOfFirstRegistration": "1987-03"
// }

// MINI
// {
//   "registrationNumber": "CE64RZA",
//   "taxStatus": "Taxed",
//   "taxDueDate": "2024-05-01",
//   "motStatus": "Valid",
//   "make": "MINI",
//   "yearOfManufacture": 2014,
//   "engineCapacity": 1998,
//   "co2Emissions": 125,
//   "fuelType": "PETROL",
//   "markedForExport": false,
//   "colour": "BLUE",
//   "typeApproval": "M1",
//   "dateOfLastV5CIssued": "2021-11-06",
//   "motExpiryDate": "2024-05-12",
//   "wheelplan": "2 AXLE RIGID BODY",
//   "monthOfFirstRegistration": "2014-09"
// }
