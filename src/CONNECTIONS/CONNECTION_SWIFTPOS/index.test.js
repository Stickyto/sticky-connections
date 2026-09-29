const connection = require('./index')

const originalFetch = global.fetch
let container

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: async () => JSON.stringify({ orderID: 123 })
  })
  container = {
    user: { id: 'user' },
    application: { id: 'application', theirId: '1' },
    payment: { id: 'payment', total: 2595, customDataPublic: { getRaw: () => ({}) } },
    customData: {
      cart: [{
        productTheirId: '2481',
        productPrice: 2595,
        quantity: 1,
        questions: [{
          type: 'options',
          options: [
            { name: 'Cajun King Prawn Taco', delta: 0, theirId: '556190' },
            { name: 'Franks Hot Sauce Chicken Wings', delta: 0, theirId: '556192' },
            { name: 'Mac & Cheese Bites', delta: 0, theirId: '556195' },
            { name: 'Peach & Feta Salad', delta: 0, theirId: '556191' }
          ],
          answer: ['Cajun King Prawn Taco', 'Mac & Cheese Bites', 'Peach & Feta Salad'],
          connectionHandleAsProduct: false,
          checklistMinimum: 3,
          checklistMaximum: 3
        }]
      }]
    },
    createEvent: jest.fn()
  }
})

afterEach(() => { global.fetch = originalFetch })

async function submit () {
  const config = [...connection.configDefaults]
  config[3] = 'encrypted-key'
  await connection.eventHooks.SESSION_CART_PAY(config, container)
  expect(container.createEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'CONNECTION_GOOD' }))
  return JSON.parse(fetch.mock.calls[0][1].body)
}

it('injects each checklist selection as a product using its option ID, even when the product flag is false', async () => {
  const payload = await submit()
  expect(payload.items).toEqual([
    { menuItemID: 2481, parentID: -1, price: 25.95, quantity: 1 },
    { menuItemID: 556190, parentID: -1, price: 0, quantity: 1 },
    { menuItemID: 556195, parentID: -1, price: 0, quantity: 1 },
    { menuItemID: 556191, parentID: -1, price: 0, quantity: 1 }
  ])
})

it('supports a single answer and carries through the quantity and option price delta', async () => {
  const item = container.customData.cart[0]
  item.quantity = 2
  item.questions[0].answer = 'Cajun King Prawn Taco'
  item.questions[0].options[0].delta = 150
  const payload = await submit()
  expect(payload.items).toEqual([
    { menuItemID: 2481, parentID: -1, price: 25.95, quantity: 2 },
    { menuItemID: 556190, parentID: -1, price: 1.5, quantity: 2 }
  ])
})

it('supports separate single-option deal questions and preserves repeated selections', async () => {
  const options = [
    { name: 'Cajun King Prawn Taco', theirId: '556190' },
    { name: 'Franks Hot Sauce Chicken Wings', theirId: '556192' },
    { name: 'Sweet Potato Falafel', theirId: '556194' },
    { name: 'Mac & Cheese Bites', theirId: '556195' },
    { name: 'Peach & Feta Salad', theirId: '556191' },
    { name: 'Salt & Pepper Fries', theirId: '556196' },
    { name: 'Duck Bao Bun Slider', theirId: '556193' }
  ].map(option => ({ ...option, delta: 0, subProducts: [], forSale: true }))
  container.customData.cart = [{
    productId: 'f908550b-d1f1-453d-b4a2-942859a7be05',
    productName: '3 Small Plates Deal',
    productPrice: 2595,
    productCurrency: 'GBP',
    productTheirId: '2481',
    quantity: 1,
    questions: ['Mac & Cheese Bites', 'Cajun King Prawn Taco', 'Cajun King Prawn Taco'].map((answer, index) => ({
      type: 'option',
      options,
      question: `Item ${index + 1}`,
      answer,
      connectionHandleAsProduct: false
    }))
  }]

  const payload = await submit()
  expect(payload.items).toEqual([
    { menuItemID: 2481, parentID: -1, price: 25.95, quantity: 1 },
    { menuItemID: 556195, parentID: -1, price: 0, quantity: 1 },
    { menuItemID: 556190, parentID: -1, price: 0, quantity: 1 },
    { menuItemID: 556190, parentID: -1, price: 0, quantity: 1 }
  ])
})

it('ignores unanswered, unmapped and non-option questions and preserves plain products', async () => {
  container.customData.cart[0].questions = [
    { answer: ['Unknown'], options: [] },
    { answer: 'No ID', options: [{ name: 'No ID' }] },
    { options: [{ name: 'Unselected', theirId: '99' }] },
    { type: 'text', answer: 'A note' }
  ]
  container.customData.cart.push({ productTheirId: '100', productPrice: 200, quantity: 1 })
  const payload = await submit()
  expect(payload.items).toEqual([
    { menuItemID: 2481, parentID: -1, price: 25.95, quantity: 1 },
    { menuItemID: 100, parentID: -1, price: 2, quantity: 1 }
  ])
})
