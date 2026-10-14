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
      logic: async ({ config = [], body = {} }) => {
        const number = typeof body.number === 'string' || typeof body.number === 'number' ? String(body.number).trim() : ''
        const name = typeof body.name === 'string' ? body.name.trim() : ''
        const invalidMembership = () => new Error(`Membership number ${number} isn't right - sorry.`)
        if (!number || !name) throw invalidMembership()

        const [endpoint, username, password, companyId] = config
        if (!endpoint || !username || !password || !Number.isSafeInteger(Number(companyId)) || Number(companyId) <= 0) {
          throw new Error('Please configure the PeopleVine endpoint, username, password and company ID.')
        }

        async function request (path, token, json) {
          const response = await fetch(`${endpoint.replace(/\/+$/, '')}/api/${path}`, {
            method: json ? 'POST' : 'GET',
            headers: {
              Region: 'eu',
              'content-type': 'application/json',
              ...(token ? { authorization: `Bearer ${token}` } : {})
            },
            ...(json ? { body: JSON.stringify(json) } : {})
          })
          if (!response.ok) {
            throw new Error(`PeopleVine ${token ? 'membership lookup' : 'authentication'} failed (${response.status}).`)
          }
          return response.json()
        }

        const { access_token: token } = await request('token', undefined, {
          grant_type: 'password',
          username,
          password,
          company_id: Number(companyId)
        })
        if (!token) throw new Error('PeopleVine authentication did not return an access token.')

        const query = new URLSearchParams({ Card_Id: number, Status: 'active' })
        const members = await request(`memberships/members?${query}`, token)
        if (!Array.isArray(members)) throw new Error('PeopleVine returned an invalid membership response.')
        const member = members.find(member =>
          member && member.card_id === number && member.status === 'active' &&
          typeof member.customer?.first_name === 'string' &&
          member.customer.first_name.trim().toLowerCase() === name.toLowerCase()
        )
        if (!member) throw invalidMembership()
        return { number: member.card_id, name: member.customer.first_name.trim() }
      }
    }
  }
})
