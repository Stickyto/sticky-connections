# Kappture

Posts paid carts as third-party sales using `PUT /transaction`.

Configuration, in order:

1. API key
2. API secret
3. Terminal number (the original draft incorrectly labelled this “Tender number”)
4. Price band number
5. Kappture session number (required; this is not a Sticky session ID)

All requests use `https://api.eu-west-1.kappture.com`.

Set the flow's **External system ID** to the Kappture tender ID returned by
`GET /tender`. Set each product's **Your ID** to its Kappture **PLU**. All cart
items must have a valid mapping. An optional touchpoint external ID supplies the
numeric table number.

Prices are tax-inclusive unit prices from the paid cart, converted from minor
currency units. VAT comes from each Sticky product's `vat--*` tag; untagged
products use zero VAT, consistent with Sticky's product VAT calculation.
Conflicting VAT tags and fractional rates (such as 12.5%, which the API's integer
`taxRate` schema cannot represent) fail explicitly.

The reference is the first nine digits extracted from the UUID payment ID,
converted to a number to fit Kappture's int32 write schema. This reference
can collide and is only a correlation reference, not a unique ID or an
idempotency guarantee. The success event records it alongside the Sticky payment
ID. Requests are not automatically retried.

The supplied third-party transactions PDF is the workflow reference. The
[API reference](https://developer.dev.kappture.com/api) additionally specifies
unit-level price/tax amounts and integer field sizes. A transaction is considered
accepted only when the response reports `processCount: 1`.

Run the isolated mocked integration tests without the repository's environment-dependent setup:

```sh
npx jest src/CONNECTIONS/CONNECTION_KAPPTURE/index.test.js --runInBand --config '{"testEnvironment":"node","setupFiles":[]}'
```

The products **Pull** action authenticates and reads `/product?count=100&page=1`,
following `totalPages`. It returns a flat JSON array of `{ id, name }` and performs
no local writes. Each returned `id` is `productId---productGroupId`, which order
injection accepts as a Kappture product/group mapping. Existing numeric PLU
mappings remain supported. Pull does not assign or change any product's Your ID.
