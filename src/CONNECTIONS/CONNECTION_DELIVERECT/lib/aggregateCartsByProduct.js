const aggregateCartsByProduct = (customData) => {
  let aggregatedCarts = {} // A map of cart IDs to their cart items and totals

  customData.cart.forEach((cartItem) => {
    if (!cartItem.productTheirId) {
      return
    }

    // Obtain the cart ID
    const cartId = cartItem.productTheirId.split('---')[0]

    // Calculate the total price of the product
    const productTotalPrice = cartItem.productPrice * cartItem.quantity

    // If this cart has been added before, append product to its cart and update its total
    if (aggregatedCarts[cartId]) {
      aggregatedCarts[cartId].cart.push(cartItem)
      aggregatedCarts[cartId].total += productTotalPrice
    } else {
      // If it's a new cart, initialize its cart and total
      aggregatedCarts[cartId] = {
        cart: [cartItem],
        total: productTotalPrice,
      }
    }
  })

  return aggregatedCarts
}

module.exports = { aggregateCartsByProduct }