const aggregateOrders = require('./aggregateOrders')

describe('aggregateOrders', () => {
  it('should aggregate orders correctly', () => {
    const combinedOrders = [
      {
        order_data: {
          items: [
            { plu: '001', name: 'Item 1', price: 10, quantity: 2, subItems: [] },
            { plu: '002', name: 'Item 2', price: 15, quantity: 1, subItems: [] },
          ],
          payment: { type: 'cash', amount: 35 },
          customer: 'John Doe',
          orderType: 'delivery',
          decimalDigits: 2,
          discountTotal: 0,
          orderIsAlreadyPaid: false,
        },
      },
      {
        order_data: {
          items: [
            { plu: '001', name: 'Item 1', price: 10, quantity: 1, subItems: [] },
            { plu: '003', name: 'Item 3', price: 20, quantity: 2, subItems: [] },
          ],
          payment: { type: 'cash', amount: 50 },
          customer: 'John Doe',
          orderType: 'delivery',
          decimalDigits: 2,
          discountTotal: 0,
          orderIsAlreadyPaid: false,
        },
      },
    ]

    const expectedAggregatedOrder = {
      items: [
        { plu: '001', name: 'Item 1', price: 10, quantity: 3, subItems: [] },
        { plu: '002', name: 'Item 2', price: 15, quantity: 1, subItems: [] },
        { plu: '003', name: 'Item 3', price: 20, quantity: 2, subItems: [] },
      ],
      payment: { type: 'cash', amount: 85 },
      customer: 'John Doe',
      orderType: 'delivery',
      decimalDigits: 2,
      discountTotal: 0,
      orderIsAlreadyPaid: false,
    }

    const aggregatedOrder = aggregateOrders(combinedOrders)

    expect(aggregatedOrder).toEqual(expectedAggregatedOrder)
  })

  it('should handle missing order data properties', () => {
    const combinedOrders = [
      {
        order_data: {
          items: [
            { plu: '001', name: 'Item 1', price: 10, quantity: 2 },
            { plu: '002', name: 'Item 2', price: 15, quantity: 1 },
          ],
          payment: { amount: 35 },
        },
      },
      {
        order_data: {
          items: [
            { plu: '001', name: 'Item 1', price: 10, quantity: 1 },
            { plu: '003', name: 'Item 3', price: 20, quantity: 2 },
          ],
          payment: { amount: 50 },
        },
      },
    ]

    const expectedAggregatedOrder = {
      items: [
        { plu: '001', name: 'Item 1', price: 10, quantity: 3, subItems: undefined },
        { plu: '002', name: 'Item 2', price: 15, quantity: 1, subItems: undefined },
        { plu: '003', name: 'Item 3', price: 20, quantity: 2, subItems: undefined },
      ],
      payment: { type: undefined, amount: 85 },
      customer: undefined,
      orderType: undefined,
      decimalDigits: undefined,
      discountTotal: undefined,
      orderIsAlreadyPaid: undefined,
    }

    const aggregatedOrder = aggregateOrders(combinedOrders)

    expect(aggregatedOrder).toEqual(expectedAggregatedOrder)
  })
})