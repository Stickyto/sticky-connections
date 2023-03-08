const importMenu = require('./index.js')
jest.setTimeout(600000000)

describe('import menu', () => {
  it('retrieves the appropriate menu from cheatmeals west hampstead', async () => {
    const result = await importMenu('https://www.just-eat.co.uk/restaurants-cheatmeals-west-hampstead/menu')

    expect(result[0].item).toMatch('Beef Burger Combo For One')
  })
})
