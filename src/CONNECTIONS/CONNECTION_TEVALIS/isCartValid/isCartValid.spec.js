const isCartValid = require('./isCartValid')

it(
  'doesnt work (productId is not a uuid)',
  () => {
    const cart = [
      {
        productId: 'wont-work'
      }
    ]

    expect(() => {
      isCartValid(cart)
    }).toThrow("ValidationError: \"[0].productId\" must be a valid GUID")
  }
)

it(
  'doesnt work (not an array)',
  () => {
    const cart = null

    expect(() => {
      isCartValid(cart)
    }).toThrow("ValidationError: \"value\" must be an array")
  }
)

it(
  'works (empty array)',
  () => {
    const cart = []
    expect(() => {
      isCartValid(cart)
    })
      .not.toThrow()
  }
)

it(
  'works (non-empty array)',
  () => {
    const cart = [
      {
        productName: 'Product 1',
        productPrice: 123,
        productCurrency: 'GBP',
        quantity: 100
      }
    ]
    expect(() => {
      isCartValid(cart)
    })
      .not.toThrow()
  }
)
