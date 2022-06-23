module.exports = function dateStringToUtc (dateString) {
  // 02/08/22
  // MM/DD/YYYY
  if (!dateString) {
    return undefined
  }
  const [month, day, year] = dateString.split('/').map(p => parseInt(p, 10))
  const dateObject = new Date(2000 + year, month - 1, day)
  return Math.floor(+dateObject / 1000)
}
