const getRelevantOrders = require('./getRelevantOrders')
const groupOrdersByChannel = require('./groupOrdersByChannel')
const aggregateOrders = require('./aggregateOrders')
const markOrdersAsDeleted = require('./markOrdersAsDeleted')
const makeRequest = require('./makeRequest')

module.exports = async function processOrders(cronContainer, groupTime) {
  try {
    const dlr = cronContainer.rdic.get('datalayerRelational')
    const orders = await getRelevantOrders(dlr, groupTime)
    const groupedOrders = groupOrdersByChannel(orders)

    for (const thingId in groupedOrders) {
      const combinedOrders = groupedOrders[thingId]
      const aggregatedOrder = aggregateOrders(combinedOrders)
      global.rdic.logger.log({}, '[job-CONNECTION_DELIVERECT] ORDERS:', aggregatedOrder)

      if (combinedOrders.length > 0) {
        const { token, url } = combinedOrders[0]

        const r = await makeRequest(
          token,
          'post',
          url,
          aggregatedOrder
        )

        global.rdic.logger.log({}, '[CONNECTION_DELIVERECT]', { r })
      }


      await markOrdersAsDeleted(dlr, combinedOrders)
    }
  } catch (e) {
    global.rdic.logger.log({}, '[job-CONNECTION_DELIVERECT] ERROR:', e.message)
  }
}