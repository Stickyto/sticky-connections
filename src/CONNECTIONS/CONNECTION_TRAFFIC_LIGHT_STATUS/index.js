const Connection = require('../Connection')

const SYSTEMS = [
  {
    id: 'KAPPTURE',
    name: 'Kappture',
    color: '#e72077'
  },
  {
    id: 'BRISK',
    name: 'Brisk',
    color: '#e72077'
  },
  {
    id: 'LINNEY',
    name: 'Linney',
    color: '#333333'
  },
  {
    id: 'BOXBAR',
    name: 'Boxbar',
    color: '#ff00bf'
  },
  {
    id: 'STICKY',
    name: 'Sticky',
    color: '#211552'
  },
  {
    id: 'LEVY',
    name: 'Levy',
    color: '#000000'
  }
]

module.exports = new Connection({
  id: 'CONNECTION_TRAFFIC_LIGHT_STATUS',
  name: 'Traffic Light Status',
  type: 'CONNECTION_TYPE_ERP',
  partnerNames: ['Traffic Light Status', 'Compass Group'],
  color: '#1e272e',
  logo: cdn => `${cdn}/connections/CONNECTION_TRAFFIC_LIGHT_STATUS.svg`,
  configNames: ['Systems (comma separated id keys)'],
  configDefaults: [''],
  instructions: () => [
    {
      "id": "71d05208-3781-4c24-996e-c4c0d1c6b228",
      "config": {
        "what": JSON.stringify(SYSTEMS.map(_ => ({ id: _.id, name: _.name, color: _.color })), null, 2),
        "font": "#1e272e--left--80%--false",
        "backgroundColour": "#FFFFFF"
      }
    }
  ]
})
