const markOrdersAsDeleted = require('./markOrdersAsDeleted')

describe('markOrdersAsDeleted', () => {
  it('should mark all orders as deleted', async () => {
    const mockDlr = {
      updateOne: jest.fn().mockResolvedValue(),
    }
    const mockCombinedOrders = [
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ]

    await markOrdersAsDeleted(mockDlr, mockCombinedOrders)

    expect(mockDlr.updateOne).toHaveBeenCalledTimes(3)
    expect(mockDlr.updateOne).toHaveBeenCalledWith('order_batches', 1, { deleted_at: expect.any(Date) })
    expect(mockDlr.updateOne).toHaveBeenCalledWith('order_batches', 2, { deleted_at: expect.any(Date) })
    expect(mockDlr.updateOne).toHaveBeenCalledWith('order_batches', 3, { deleted_at: expect.any(Date) })
  })

  it('should handle an empty array of combined orders', async () => {
    const mockDlr = {
      updateOne: jest.fn().mockResolvedValue(),
    }
    const mockCombinedOrders = []

    await markOrdersAsDeleted(mockDlr, mockCombinedOrders)

    expect(mockDlr.updateOne).not.toHaveBeenCalled()
  })

  it('should propagate errors from the updateOne method', async () => {
    const mockDlr = {
      updateOne: jest.fn().mockRejectedValue(new Error('Database error')),
    }
    const mockCombinedOrders = [
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ]

    await expect(markOrdersAsDeleted(mockDlr, mockCombinedOrders)).rejects.toThrow('Database error')
    expect(mockDlr.updateOne).toHaveBeenCalledTimes(1)
  })
})