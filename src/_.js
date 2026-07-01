const __ = new Map([
  [
    'MAGIC_BUCKET_NO_REPLY',
    new Map([
      ['default', () => "Sorry, I can't answer that."]
    ])
  ]
])

module.exports = function (what, language = 'default') {
  const found1 = __.get(what)
  return (found1.get(language) || found1.get('default'))()
}
