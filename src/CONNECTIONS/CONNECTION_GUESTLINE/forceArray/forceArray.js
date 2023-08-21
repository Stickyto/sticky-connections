module.exports = function forceArray (_) {
  return Array.isArray(_) ? _ : [_]
}
