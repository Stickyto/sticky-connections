const unformatPhone = require('./unformatPhone')

it('works for countries that exist with a local formatPhone method (GBR in GBR; 1)', () => {
  const r = unformatPhone('+4479035 76776', 'GBR')
  expect(r).toBe('07903576776')
})

it('works for countries that exist with a local formatPhone method (GBR in GBR; 2)', () => {
  const r = unformatPhone('079035 76776', 'GBR')
  expect(r).toBe('07903576776')
})

it('doesnt work for countries that exist with a local formatPhone method (SPA in GBR)', () => {
  const r = unformatPhone('+3479035XXXXX76776', 'GBR')
  expect(r).toBe(undefined)
})

it('doesnt work for countries that exist without a local formatPhone method', () => {
  const r = unformatPhone('+35379035 76776', 'IRL')
  expect(r).toBe(undefined)
})

it('doesnt work for countries that do not exist', () => {
  const r = unformatPhone('+347903576776', 'SPA')
  expect(r).toBe(undefined)
})
