const groupOrdersByChannel = require('./groupOrdersByChannel')

describe('groupOrdersByChannel', () => {
  it('should group orders by thing_id', () => {
    const orders = [
      { id: 1, thing_id: 'a' },
      { id: 2, thing_id: 'b' },
      { id: 3, thing_id: 'a' },
      { id: 4, thing_id: 'c' },
      { id: 5, thing_id: 'b' },
    ]

    const expectedGroupedOrders = {
      a: [
        { id: 1, thing_id: 'a' },
        { id: 3, thing_id: 'a' },
      ],
      b: [
        { id: 2, thing_id: 'b' },
        { id: 5, thing_id: 'b' },
      ],
      c: [{ id: 4, thing_id: 'c' }],
    }

    const groupedOrders = groupOrdersByChannel(orders)

    expect(groupedOrders).toEqual(expectedGroupedOrders)
  })

  it('should handle an empty array of orders', () => {
    const orders = []

    const expectedGroupedOrders = {}

    const groupedOrders = groupOrdersByChannel(orders)

    expect(groupedOrders).toEqual(expectedGroupedOrders)
  })

  it('should handle orders with missing thing_id', () => {
    const orders = [
      { id: 1, thing_id: 'a' },
      { id: 2 },
      { id: 3, thing_id: 'a' },
      { id: 4, thing_id: undefined },
      { id: 5, thing_id: 'b' },
    ]

    const expectedGroupedOrders = {
      a: [
        { id: 1, thing_id: 'a' },
        { id: 3, thing_id: 'a' },
      ],
      undefined: [{ id: 2 }, { id: 4, thing_id: undefined }],
      b: [{ id: 5, thing_id: 'b' }],
    }

    const groupedOrders = groupOrdersByChannel(orders)

    expect(groupedOrders).toEqual(expectedGroupedOrders)
  })
})