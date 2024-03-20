module.exports = function groupOrdersByChannel(orders) {
  return orders.reduce((acc, order) => {
    if (!acc[order.thing_id]) {
      acc[order.thing_id] = []
    }
    acc[order.thing_id].push(order)
    return acc
  }, {})
}
