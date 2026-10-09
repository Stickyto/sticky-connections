const shopify = require('./index')

global.fetch = jest.fn()

describe('CONNECTION_SHOPIFY', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('creates a payment link and shares it to the Shopify customer', async () => {
    const flowId = '11111111-1111-4111-8111-111111111111'
    const connectionContainer = {
      user: {
        privateKey: 'private-key'
      },
      rdic: {
        get: () => ({
          apiUrl: 'https://sticky.to'
        })
      }
    }

    fetch
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 'payment-id' })
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 'short-link-id' })
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 'sms-share-id' })
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 'email-share-id' })
      })

    const result = await shopify.methods.order.logic({
      connectionContainer,
      config: [flowId],
      body: {
        currency: 'GBP',
        total_price: '8.99',
        order_number: 1234,
        customer: {
          email: 'tim@sticky.to',
          phone: '+44123123123'
        }
      }
    })

    expect(fetch).toHaveBeenCalledTimes(4)
    expect(fetch).toHaveBeenNthCalledWith(1, 'https://sticky.to/v1/applications/unknown-application-3/payments', {
      method: 'post',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer private-key'
      },
      body: JSON.stringify({
        total: 899,
        currency: 'GBP',
        userPaymentId: '1234',
        email: 'tim@sticky.to',
        phone: '+44123123123'
      })
    })
    expect(fetch).toHaveBeenNthCalledWith(2, 'https://sticky.to/v2/short-links', expect.objectContaining({
      body: JSON.stringify({
        whichUrl: `https://sticky.to/go/flow/${flowId}?paymentId=payment-id`,
        type: 'REDIRECT'
      })
    }))
    expect(fetch).toHaveBeenNthCalledWith(3, 'https://sticky.to/v2/trigger/share', expect.objectContaining({
      body: JSON.stringify({
        entity: 'short-link',
        entityId: 'short-link-id',
        destination: 'sms',
        to: '+44123123123'
      })
    }))
    expect(fetch).toHaveBeenNthCalledWith(4, 'https://sticky.to/v2/trigger/share', expect.objectContaining({
      body: JSON.stringify({
        entity: 'short-link',
        entityId: 'short-link-id',
        destination: 'email',
        to: 'tim@sticky.to'
      })
    }))
    expect(result).toEqual({
      payment: { id: 'payment-id' },
      shortLink: { id: 'short-link-id' },
      shares: [
        { id: 'sms-share-id' },
        { id: 'email-share-id' }
      ]
    })
  })
})
