const parseResponse = require('./parseResponse')

it('works', async () => {
  const xml = '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><el1>el2</el1></s:Envelope>'
  const response = await parseResponse(xml, '//el1/text()')
  expect(response).toBe('el2')
})
