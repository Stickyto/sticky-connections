const got = require('got')
const { assert } = require('openbox-node-utils')
const Connection = require('../Connection')

async function makeRequest (url) {
  global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] url', url)
  const { body: bodyAsString } = await got.get(
    url,
    {
      headers: {}
    }
  )
  global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] typeof bodyAsString', typeof bodyAsString)
  global.rdic.logger.log({}, '[CONNECTION_PLAY_IT_GREEN] [makeRequest] bodyAsString.length', bodyAsString.length)

  const toReturn = typeof bodyAsString === 'string' && bodyAsString.length > 0 ? bodyAsString : undefined
  return toReturn
}

module.exports = new Connection({
  id: 'CONNECTION_PLAY_IT_GREEN',
  name: 'Play It Green',
  partnerIds: ['3caf5a65-12ba-4db7-aeb6-a8b4c8b37c98'],
  color: '#5CC239',
  logo: cdn => `${cdn}/connections/CONNECTION_PLAY_IT_GREEN.png`,
  configNames: ['Forest Garden ID'],
  configDefaults: ['297'],
  methods: {
    getForestGarden: {
      name: 'Get Forest Garden',
      logic: async ({ config }) => {
        const [configId] = config
        const url = `https://playitgreen.com/forestgarden/?id=${configId}`
        const r = await makeRequest(url)
        const vStart = r.indexOf('class="total_quantity">') + 'class="total_quantity">'.length
        let v = r.substring(vStart)
        v = v.substring(0, v.indexOf('<'))
        const asInt = parseInt(v, 10)
        assert(!isNaN(asInt), `There isn't a Forest Garden with ID "${configId}".`)
        return {
          trees: asInt
        }
      }
    }
  }
})
