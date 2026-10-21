const { assert, isUuid } = require('@stickyto/openbox-node-utils')
const Connection = require('../Connection')

module.exports = new Connection({
  id: 'CONNECTION_PEOPLEVINE',
  type: 'CONNECTION_TYPE_ERP',
  name: 'Peoplevine',
  color: '#CF8516',
  logo: cdn => `${cdn}/connections/CONNECTION_PEOPLEVINE.svg`,
  configNames: ['Endpoint', 'Username', 'Password', 'Company ID'],
  configDefaults: ['https://api.peoplevine.dev', '', '', ''],
  methods: {
    verify: {
      name: 'Verify',
      logic: async ({ connectionContainer, config = [], body = {} }) => {
        const { rdic, user } = connectionContainer
        const number = typeof body.number === 'string' || typeof body.number === 'number' ? String(body.number).trim() : ''
        const name = typeof body.name === 'string' ? body.name.trim() : ''

        const { sessionId } = body
        assert(isUuid(sessionId), 'sessionId is not a uuid!')
        const session = await rdic.dlGetSession(sessionId)
        assert(session, 'session did not resolve!')
        const userSector = session.userSectors.readFrom(user.id)

        assert(/^\d+$/.test(number) && Number.isSafeInteger(Number(number)) && Number(number) > 0 && name,
          `Membership number ${number} isn't right - sorry (1).`)

        const [endpoint, username, password, companyId] = config
        assert(
          endpoint && username && password && Number.isSafeInteger(Number(companyId)) && Number(companyId) > 0,
          'Please configure the PeopleVine endpoint, username, password and company ID.'
        )

        const api = `${endpoint.replace(/\/+$/, '')}/api`
        const tokenResponse = await fetch(`${api}/token`, {
          method: 'POST',
          headers: { Region: 'eu', 'content-type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'password',
            username,
            password,
            company_id: Number(companyId)
          })
        })
        assert(tokenResponse.ok, `PeopleVine authentication failed (${tokenResponse.status}).`)
        const { access_token: token } = await tokenResponse.json()
        assert(token, 'PeopleVine authentication did not resolve an access token.')

        const headers = {
          Region: 'eu',
          'content-type': 'application/json',
          authorization: `Bearer ${token}`
        }

        const directResponse = await fetch(`${api}/memberships/members/${encodeURIComponent(number)}`, {
          method: 'GET',
          headers
        })
        const matchesNameAndStatus = member => member?.status === 'active' &&
          member.customer?.first_name?.trim().toLowerCase() === name.toLowerCase()
        let member
        if (directResponse.status === 200) {
          const directMember = await directResponse.json()
          if (Number(directMember?.id) === Number(number) && matchesNameAndStatus(directMember)) {
            member = directMember
          }
        }

        // PeopleVine has separate member, printed card and customer identifiers.
        // Query each separately: combining filters would require every ID to match.
        for (const [filter, field] of [['Card_Id', 'card_id'], ['Customer_Id', 'customer_id']]) {
          if (member) break
          const query = new URLSearchParams({ [filter]: number, Status: 'active' })
          const response = await fetch(`${api}/memberships/members?${query}`, { method: 'GET', headers })
          if (response.status === 204) continue
          assert(response.ok, `PeopleVine membership lookup failed (${response.status}).`)
          const members = await response.json()
          assert(Array.isArray(members), 'PeopleVine resolved an invalid membership response.')
          member = members.find(candidate => matchesNameAndStatus(candidate) &&
            (field === 'card_id' ? String(candidate[field]) === number : Number(candidate[field]) === Number(number)))
        }
        assert(member, `Membership number ${number} isn't right - sorry (2).`)
        userSector.writeTo('ID', member.customer_id)
        userSector.writeTo(`${user.name} Peoplevine membership name`, name)
        userSector.writeTo(`${user.name} Peoplevine membership number`, Number(number))
        if (!session.crossUserSector.readFrom('name')) {
          session.crossUserSector.writeTo('name', name)
        }
        await rdic.get('datalayerRelational').updateOne('sessions', session.id, session.toDatalayerRelational(['userSectors', 'crossUserSector']))
        return { number: member.card_id, name: member.customer.first_name.trim() }
      }
    }
  }
})
