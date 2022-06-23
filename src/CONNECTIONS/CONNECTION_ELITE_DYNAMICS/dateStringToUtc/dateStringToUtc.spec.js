const dateStringToUtc = require('./dateStringToUtc')

it('works', () => {
  expect(
    dateStringToUtc('04/01/22')
  )
    .toBe(1648767600)
})
