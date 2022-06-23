const go = require('./go')

const VALID_USER = {
  connections: [{
    id: 'CONNECTION_ELITE_DYNAMICS',
    config: ['sticky@elitedynamics.co.uk', '', '']
  }]
}

describe('doesnt work', () => {
  it('respects connection', async () => {
    const user = {
      connections: []
    }

    await expect(
      go('DOESNT_EXIST', 'authenticate', { user })
    )
      .rejects.toMatchObject({
        message: 'There isn\'t a connection called DOESNT_EXIST!',
      })
  })

  it.skip('respects method', async () => {
    const user = {
      connections: []
    }

    await expect(
      go('CONNECTION_ELITE_DYNAMICS', 'doesntExist', { user })
    )
      .rejects.toMatchObject({
        message: 'Elite Dynamics doesn\'t have a method called doesntExist!',
      })
  })

  it.skip('respects configuration', async () => {
    const user = {
      connections: []
    }

    await expect(
      go('CONNECTION_ELITE_DYNAMICS', 'bookingAuthenticate', { user })
    )
      .rejects.toMatchObject({
        message: 'Elite Dynamics isn\'t configured!',
      })
  })
})
