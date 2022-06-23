module.exports = function timeStringToSeconds (timeString) {
  // 4:00:00 PM
  if (typeof timeString === 'string') {
    timeString = timeString.trim()
  }
  if (!timeString) {
    return undefined
  }
  const [time, amPm] = timeString.split(' ')
  const [hours, minutes, seconds] = time
    .split(':')
    .map(e => parseInt(e, 10))
  const toReturn = (seconds + (minutes * 60) + (hours * 60 * 60)) + (amPm === 'PM' ? (12 * 60 * 60) : 0)
  return toReturn
}
