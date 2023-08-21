const remoteDateToEpoch = require('./remoteDateToEpoch')

it('works', () => {
  expect(
    remoteDateToEpoch('2023-08-14T00:00:00')
  )
    .toBe(1691967600)
})
