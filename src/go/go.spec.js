const go = require('./go')

const VALID_USER = {
  connections: [{
    id: 'CONNECTION_ELITE_DYNAMICS',
    config: ['sticky@elitedynamics.co.uk', '', '']
  }]
}

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

  it.skip('respects method', async () => {
    await expect(
      go('CONNECTION_ELITE_DYNAMICS', 'doesntExist', { user })
    )
      .rejects.toMatchObject({
        message: 'EliteParks doesn\'t have a method called doesntExist!',
      })
  })

  it.skip('respects configuration', async () => {
    await expect(
      go('CONNECTION_ELITE_DYNAMICS', 'bookingAuthenticate', { user })
    )
      .rejects.toMatchObject({
        message: 'EliteParks isn\'t configured!',
      })
  })
})
