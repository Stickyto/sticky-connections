module.exports = async function markOrdersAsDeleted(dlr, combinedOrders) {
  for (const order of combinedOrders) {
    await dlr.updateOne('order_batches', order.id, { deleted_at: new Date() })
  }
}