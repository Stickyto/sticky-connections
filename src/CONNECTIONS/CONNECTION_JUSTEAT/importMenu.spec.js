const importMenu = require('./importMenu.js')
jest.setTimeout(600000000)

describe('import menu', () => {
  it.skip('retrieves the appropriate menu from cheatmeals west hampstead', async () => {
    const result = await importMenu('https://www.just-eat.co.uk/restaurants-cheatmeals-west-hampstead/menu')
    console.log(JSON.stringify(result, null, 2))
    expect(result[0].item).toMatch('Beef Burger Combo For One')
  })
  it('retrieves the appropriate menu from roast-hunsworth', async () => {
    const result = await importMenu('https://www.just-eat.es/restaurants-saucy-buns-by-taster-madrid/menu')
    console.log(JSON.stringify(result, null, 2))
    expect(result[0].item).toMatch('Big \'n\' Beefy Hamburger')
  })
})
