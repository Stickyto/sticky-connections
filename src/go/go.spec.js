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
    id: '3caf5a65-12ba-4db7-aeb6-a8b4c8b37c98' // EliteParks
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
      id: 'e7893791-5747-47e6-881f-bf3b3599e6f9' // Accept Cards
    }
    await expect(
      go('CONNECTION_DATAVERSE', 'authenticate', { user, partner })
    )
      .rejects.toMatchObject({
        message: 'Connection CONNECTION_DATAVERSE didn\'t pass isAMatch()'
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
