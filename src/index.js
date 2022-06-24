const { version } = require('../package.json')
const go = require('./go/go')
const getAll = require('./getAll/getAll')
const getAllEventHooks = require('./getAllEventHooks/getAllEventHooks')
const getAllCrons = require('./getAllCrons/getAllCrons')

module.exports = {
  version,
  go,
  getAll,
  getAllEventHooks,
  getAllCrons
}
