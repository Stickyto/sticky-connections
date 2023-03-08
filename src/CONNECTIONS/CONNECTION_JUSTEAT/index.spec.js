const menuScraper = require('./index.js')
jest.setTimeout(600000000)

describe('menu scraper', () => {
  it('retrieves the appropriate menu from cheatmeals west hampstead', async () => {
    const result = await menuScraper('https://www.just-eat.co.uk/restaurants-cheatmeals-west-hampstead/menu')

    expect(result[0].item).toMatch('Beef Burger Combo For One')
  })
})
