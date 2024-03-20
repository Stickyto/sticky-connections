const processOrders = require('./processOrders')
const getRelevantOrders = require('./getRelevantOrders')
const groupOrdersByChannel = require('./groupOrdersByChannel')
const aggregateOrders = require('./aggregateOrders')
const markOrdersAsDeleted = require('./markOrdersAsDeleted')

jest.mock('./getRelevantOrders')
jest.mock('./groupOrdersByChannel')
jest.mock('./aggregateOrders')
jest.mock('./markOrdersAsDeleted')

describe('processOrders', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('should process orders successfully', async () => {
    const cronContainer = {
      rdic: {
        get: jest.fn().mockReturnValue('mock-dlr'),
        logger: {
          log: jest.fn(),
        },
      },
    }
    const groupTime = 60
    const mockOrders = [{ id: 1 }, { id: 2 }]
    const mockGroupedOrders = { '1': [{ id: 1 }], '2': [{ id: 2 }] }
    const mockAggregatedOrder = { items: [], payment: { type: 'credit', amount: 0 } }

    getRelevantOrders.mockResolvedValue(mockOrders)
    groupOrdersByChannel.mockReturnValue(mockGroupedOrders)
    aggregateOrders.mockReturnValue(mockAggregatedOrder)

    await processOrders(cronContainer, groupTime)

    expect(cronContainer.rdic.get).toHaveBeenCalledWith('datalayerRelational')
    expect(getRelevantOrders).toHaveBeenCalledWith('mock-dlr', groupTime)
    expect(groupOrdersByChannel).toHaveBeenCalledWith(mockOrders)
    expect(aggregateOrders).toHaveBeenCalledTimes(2)
    expect(aggregateOrders).toHaveBeenCalledWith([{ id: 1 }])
    expect(aggregateOrders).toHaveBeenCalledWith([{ id: 2 }])
    expect(markOrdersAsDeleted).toHaveBeenCalledTimes(2)
    expect(markOrdersAsDeleted).toHaveBeenCalledWith('mock-dlr', [{ id: 1 }])
    expect(markOrdersAsDeleted).toHaveBeenCalledWith('mock-dlr', [{ id: 2 }])
  })

  it('should handle errors and log them', async () => {
    const cronContainer = {
      rdic: {
        get: jest.fn().mockReturnValue('mock-dlr'),
        logger: {
          log: jest.fn(),
        },
      },
    }
    const groupTime = 60
    const errorMessage = 'Something went wrong'

    getRelevantOrders.mockRejectedValue(new Error(errorMessage))

    await processOrders(cronContainer, groupTime)

    expect(cronContainer.rdic.get).toHaveBeenCalledWith('datalayerRelational')
    expect(getRelevantOrders).toHaveBeenCalledWith('mock-dlr', groupTime)
    expect(groupOrdersByChannel).not.toHaveBeenCalled()
    expect(aggregateOrders).not.toHaveBeenCalled()
    expect(markOrdersAsDeleted).not.toHaveBeenCalled()
  })
})