const { COUNTRIES } = require('openbox-node-utils')

module.exports = function unformatPhone (number, country) {
  const foundCountry = COUNTRIES.get(country)
  return foundCountry && foundCountry.formatPhone ? foundCountry.formatPhone(number) : undefined
}
