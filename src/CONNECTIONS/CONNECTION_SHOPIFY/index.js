const { assert, isUuid } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')

function priceToMinorUnits(price) {
  const asNumber = Number(price)
  assert(Number.isFinite(asNumber), `Shopify total_price is not a valid number: ${price}`)
  return Math.round(asNumber * 100)
}

function firstString(...values) {
  const found = values.find(_ => typeof _ === 'string' && _.trim().length > 0)
  return found ? found.trim() : undefined
}

function getContact(body) {
  return {
    email: firstString(body.email, body.contact_email, body.customer && body.customer.email),
    phone: firstString(
      body.phone,
      body.customer && body.customer.phone,
      body.billing_address && body.billing_address.phone,
      body.shipping_address && body.shipping_address.phone
    )
  }
}

async function postJson(privateKey, url, json) {
  const response = await fetch(
    url,
    {
      method: 'post',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${privateKey}`
      },
      body: JSON.stringify(json)
    }
  )
  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(`!response.ok: [${url}]: ${responseText}`)
  }

  return responseText ? JSON.parse(responseText) : {}
}

module.exports = new Connection({
  id: 'CONNECTION_SHOPIFY',
  name: 'Shopify',
  color: '#95BF47',
  logo: cdn => `${cdn}/connections/CONNECTION_SHOPIFY.svg`,
  configNames: ['Flow ID'],
  configDefaults: [''],
  methods: {
    order: {
      name: 'Order',
      logic: async ({ connectionContainer, config = [], body }) => {
        const { user, rdic } = connectionContainer
        const [applicationId] = config
        const { apiUrl } = rdic.get('environment')
        const { email, phone } = getContact(body)

        assert(isUuid(applicationId), 'Flow ID is not a UUID.')
        assert(typeof body.currency === 'string' && body.currency.length > 0, 'Shopify currency is missing.')
        assert(body.order_number !== undefined, 'Shopify order_number is missing.')

        const payment = await postJson(
          user.privateKey,
          `${apiUrl}/v1/applications/unknown-application-3/payments`,
          {
            total: priceToMinorUnits(body.total_price),
            currency: body.currency,
            userPaymentId: String(body.order_number),
            email,
            phone
          }
        )

        const shortLink = await postJson(
          user.privateKey,
          `${apiUrl}/v2/short-links`,
          {
            whichUrl: `${apiUrl}/go/flow/${applicationId}?paymentId=${payment.id}`,
            type: 'REDIRECT'
          }
        )

        const shares = []
        if (phone) {
          shares.push(await postJson(
            user.privateKey,
            `${apiUrl}/v2/trigger/share`,
            {
              entity: 'short-link',
              entityId: shortLink.id,
              destination: 'sms',
              to: phone
            }
          ))
        }
        if (email) {
          shares.push(await postJson(
            user.privateKey,
            `${apiUrl}/v2/trigger/share`,
            {
              entity: 'short-link',
              entityId: shortLink.id,
              destination: 'email',
              to: email
            }
          ))
        }

        return {
          shortLink,
          shares
        }
      }
    }
  }
})
