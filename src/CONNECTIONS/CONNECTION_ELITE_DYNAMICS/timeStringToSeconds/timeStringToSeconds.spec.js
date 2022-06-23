const timeStringToSeconds = require('./timeStringToSeconds')

it('returns undefined for an empty string', () => {
  expect(
    timeStringToSeconds('')
  )
    .toBe(undefined)
})

it('returns undefined for an emptyish string', () => {
  expect(
    timeStringToSeconds(' ')
  )
    .toBe(undefined)
})

it('returns seconds for a not empty string (AM)', () => {
  expect(
    timeStringToSeconds('10:00:00 AM')
  )
    .toBe(36000)
})

it('returns seconds for a not empty string (PM)', () => {
  expect(
    timeStringToSeconds(' 4:00:00 PM')
  )
    .toBe(57600)
})
