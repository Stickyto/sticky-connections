
module.exports = function aggregateOrders(combinedOrders) {
  return combinedOrders.reduce((acc, order) => {
    order.order_data.items.forEach(item => {
      const { plu, name, price, quantity, subItems } = item
      const existingItemIndex = acc.items.findIndex(i => i.plu === plu)
      if (existingItemIndex !== -1) {
        acc.items[existingItemIndex].quantity += quantity
      } else {
        acc.items.push({ plu, name, price, quantity, subItems })
      }
    })
    acc.payment.amount += order.order_data.payment.amount
    return acc
  }, {
    items: [],
    payment: {
      type: combinedOrders[0].order_data.payment.type,
      amount: 0,
    },
    customer: combinedOrders[0].order_data.customer,
    orderType: combinedOrders[0].order_data.orderType,
    decimalDigits: combinedOrders[0].order_data.decimalDigits,
    discountTotal: combinedOrders[0].order_data.discountTotal,
    orderIsAlreadyPaid: combinedOrders[0].order_data.orderIsAlreadyPaid,
  })
}