const Joi = require('joi')
const { assert } = require('@stickyto/openbox-node-utils')

let schemaCartItem = Joi.object().keys({
  productId: Joi.string().strict().guid(),
  productName: Joi.string().strict().required(),
  productPrice: Joi.number().strict().integer().required(),
  productCurrency: Joi.string().strict().required(),
  productTheirId: Joi.string().strict(),
  quantity: Joi.number().strict().integer().required()
})

const schemaCart = Joi.array().items(schemaCartItem)

module.exports = isCartValid = cart => {
  const { error } = schemaCart.validate(cart)
  assert(!error, error)
}
