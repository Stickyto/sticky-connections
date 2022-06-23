const { version } = require('../package.json')
const go = require('./go/go')
const getAll = require('./getAll/getAll')
const getAllCrons = require('./getAllCrons/getAllCrons')

module.exports = {
  version,
  go,
  getAll,
  getAllCrons
}
