const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { test } = require('node:test')
const connection = require('./index')

// Intentionally outside Jest: fetch and the PeopleVine API are never mocked.
// Only Sticky session persistence is replaced with in-memory storage.
test('PeopleVine: all three numbers resolve Daniel to the same member', { timeout: 120000 }, async t => {
  const config = [
    process.env.PEOPLEVINE_ENDPOINT || 'https://api.peoplevine.dev',
    process.env.PEOPLEVINE_USERNAME,
    process.env.PEOPLEVINE_PASSWORD,
    process.env.PEOPLEVINE_COMPANY_ID
  ]
  assert.ok(config[1] && config[2] && config[3],
    'Live credentials required: set PEOPLEVINE_USERNAME, PEOPLEVINE_PASSWORD and PEOPLEVINE_COMPANY_ID in .env or the environment.')

  const canonical = { result: { number: '13396', name: 'Daniel' }, customerId: 745681 }
  for (const number of ['745681', '149242', '13396']) {
    await t.test(`${number} returns the same Daniel member and customer ID`, { timeout: 35000 }, async t => {
      const sessionId = randomUUID()
      const values = {}
      const names = {}
      let saved
      const session = {
        id: sessionId,
        userSectors: { readFrom: () => ({ writeTo: (key, value) => { values[key] = value } }) },
        crossUserSector: {
          readFrom: key => names[key],
          writeTo: (key, value) => { names[key] = value }
        },
        toDatalayerRelational: () => ({ userSectors: { ...values }, crossUserSector: { ...names } })
      }
      const connectionContainer = {
        user: { id: 'peoplevine-integration', name: 'Integration' },
        rdic: {
          dlGetSession: async id => {
            assert.equal(id, sessionId)
            return session
          },
          get: service => {
            assert.equal(service, 'datalayerRelational')
            return {
              updateOne: async (table, id, data) => {
                assert.equal(table, 'sessions')
                assert.equal(id, sessionId)
                saved = data
              }
            }
          }
        }
      }

      const result = await connection.methods.verify.logic({
        connectionContainer, config, body: { sessionId, number, name: 'Daniel' }
      })
      assert.equal(result.name, 'Daniel')
      assert.ok(result.number, 'PeopleVine must return a canonical card number')
      assert.ok(Number.isSafeInteger(Number(values.ID)) && Number(values.ID) > 0, 'A customer ID must be saved')
      assert.equal(saved?.userSectors.ID, values.ID)
      assert.equal(saved?.crossUserSector.name, 'Daniel')
      const actual = { result, customerId: values.ID }
      assert.deepEqual(actual, canonical)
      t.diagnostic(JSON.stringify({ input: number, ...actual }))
    })
  }
})
