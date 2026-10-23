const assert = require('node:assert/strict')
const { test } = require('node:test')
const connection = require('./index')

// Read-only: real fetch and the real connection implementation, with no orders
// or Sticky persistence writes. GUID2 is intentionally unnecessary here.
test('Tevalis sandbox: authenticated reads and frontend product mappings', { timeout: 120000 }, async t => {
  const guid = process.env.TEVALIS_GUID
  const devId = process.env.TEVALIS_DEVID
  assert.ok(guid && devId, 'Set TEVALIS_GUID and TEVALIS_DEVID to the supplied sandbox credentials.')
  const config = ['2699', guid, devId, '', '10979', '', '2', '', '']
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json', CompanyId: '2699', GUID: guid, DevID: devId }
  const paths = [
    'Sites',
    'SalesArea/10979',
    'v3/ProductCatalogue?SiteID=10979&IsActive=true',
    'PriceGroups/10979',
    'TenderTypes/GetTenderTypes/10979?Active=true',
    'v2/OnlineOrders/CheckConnection?SiteID=10979'
  ]
  const results = await Promise.all(paths.map(async path => {
    const res = await fetch(`https://api.tevalis.com/${path}`, { headers, signal: AbortSignal.timeout(30000) })
    const body = await res.text()
    assert.equal(res.status, 200, `${path}: HTTP ${res.status}: ${body}`)
    return JSON.parse(body)
  }))
  const [sites, areas, catalogue, groups, tenders, connected] = results
  assert.ok(sites.some(site => site.SiteID === 10979 && site.IsAvailableThroughAPI))
  assert.equal(areas.SiteID, 10979)
  assert.ok(Array.isArray(areas.SalesAreas))
  assert.ok(groups.PriceGroups.some(group => group.PriceGroupID === 2))
  assert.ok(tenders.some(tender => tender.TenderTypeID === 1003))
  assert.equal(connected, true)
  assert.equal(catalogue.SiteID, 10979)
  assert.ok(catalogue.Products.length > 0)

  // Exercise the same Pull entry point used by the frontend, not a separate mapper.
  const products = await connection.methods.getLocations.logic({ config })
  const expectedIds = new Set(catalogue.Products.flatMap(product => product.Prices)
    .filter(price => price.PriceGroupID === 2).map(price => String(price.PriceId)))
  assert.deepEqual(new Set(products.map(product => product.id)), expectedIds)
  assert.ok(products.every(product => typeof product.name === 'string' && product.name.trim()))
  assert.deepEqual(products.find(product => product.id === '4'), { id: '4', name: 'Coke (284ml)' })
  assert.deepEqual(products.find(product => product.id === '5'), { id: '5', name: 'Coke (568ml)' })
  t.diagnostic(JSON.stringify({
    paths: paths.map(path => ({ path, status: 200 })),
    productCount: catalogue.Products.length,
    mappingCount: products.length,
    priceGroupId: 2,
    cardTenderId: 1003,
    connected,
    sample: products.slice(0, 5)
  }))
})
