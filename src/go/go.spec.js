const go = require('./go')

const VALID_USER = {
  connections: [{
    id: 'CONNECTION_ELITE_DYNAMICS',
    config: [
      '---',
      '---',
      'https://api.businesscentral.dynamics.com/.default',
      'https://login.microsoftonline.com/---/oauth2/v2.0/token',
      'https://api.businesscentral.dynamics.com/v2.0/---/Sandbox/WS/Customer-Name/Codeunit'
    ]
  }]
}

const BOOKING_ID = 'BK123'

let user, partner
beforeEach(() => {
  user = {
    id: '123-456',
    connections: []
  }
  partner = {
    name: 'Elite Dynamics'
  }
})

describe('doesnt work', () => {
  it('respects connection existence', async () => {
    await expect(
      go('DOESNT_EXIST', 'authenticate', { user, partner })
    )
      .rejects.toMatchObject({
        message: 'There isn\'t a connection called DOESNT_EXIST!'
      })
  })

  it('respects connection matching', async () => {
    partner = {
      name: 'Not Elite Dynamics'
    }
    await expect(
      go('CONNECTION_ELITE_DYNAMICS', 'authenticate', { user, partner })
    )
      .rejects.toMatchObject({
        message: 'Connection CONNECTION_ELITE_DYNAMICS didn\'t pass isAMatch()'
      })
  })

  it('respects method', async () => {
    partner = {
      name: 'Elite Dynamics'
    }

    await expect(
      go('CONNECTION_ELITE_DYNAMICS', 'doesntExist', { user, partner })
    )
      .rejects.toMatchObject({
        message: 'EliteParks doesn\'t have a method called doesntExist!',
      })
  })

  it('respects configuration', async () => {
    partner = {
      name: 'Elite Dynamics'
    }

    await expect(
      go('CONNECTION_ELITE_DYNAMICS', 'bookingGet', { user, partner })
    )
      .rejects.toMatchObject({
        message: 'EliteParks isn\'t configured!',
      })
  })

  it('works', async () => {
    partner = {
      name: 'Elite Dynamics'
    }

    const r = await go('CONNECTION_ELITE_DYNAMICS', 'bookingGet', { user: VALID_USER, partner, body: { bookingId: BOOKING_ID } })
    expect(r.id).toBe(BOOKING_ID)
    expect(r.total).toBe(8000)
  })
})
