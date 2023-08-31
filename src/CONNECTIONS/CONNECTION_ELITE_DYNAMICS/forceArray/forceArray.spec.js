const forceArray = require('./forceArray')

it('returns an array (1)', () => {
  expect(
    forceArray([{ key1: 'value1' }])[0].key1
  ).toBe('value1')
})

it('returns an array (2)', () => {
  expect(
    forceArray({ key1: 'value1' })[0].key1
  ).toBe('value1')
})
