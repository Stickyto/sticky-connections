jest.mock('@stickyto/openbox-node-utils', () => {
  const actual = jest.requireActual('@stickyto/openbox-node-utils')
  return {
    ...actual,
    services: {
      ...actual.services,
      mail: { ...actual.services.mail, quickSend: jest.fn() }
    }
  }
})

const { Event, CustomData } = require('openbox-entities')
const { services } = require('@stickyto/openbox-node-utils')
const connection = require('./index')

describe('CONNECTION_TRAFFIC_LIGHT_STATUS incident emails', () => {
  let quickSend
  let container

  beforeEach(() => {
    quickSend = services.mail.quickSend.mockReset().mockResolvedValue(undefined)
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    container = {
      rdic: {
        dlGetFederatedUser: jest.fn().mockResolvedValue({ id: 'reporter-id', email: 'reporter@example.com' })
      },
      user: { id: 'user-id' },
      thing: {
        id: 'thing-id',
        name: 'Till & bar',
        theirId: 'T-01',
        customData: new CustomData({ 'Traffic Light Status system': 'KAPPTURE' })
      },
      event: new Event({ id: '12345678-incident-id', federatedUserId: 'reporter-id' }),
      createEvent: jest.fn(async payload => new Event({ ...payload, id: '87654321-incident-id' }))
    }
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('emails incident details from the CustomData returned by createEvent', async () => {
    container.customData = {
      'This is a...': 'P1 - High',
      'What can you see?': 'https://example.com/photo.jpg',
      'Anything else we should know?': 'Till <offline>'
    }

    await connection.eventHooks.LD_V2([], container)

    expect(container.createEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'TRAFFIC_LIGHT_STATUS_INCIDENT',
      customData: {
        Priority: 'P1',
        Photo: 'https://example.com/photo.jpg',
        Description: 'Till <offline>'
      }
    }))
    expect(quickSend).toHaveBeenCalledWith(container.rdic, expect.objectContaining({
      to: 'reporter@example.com',
      subject: '[P1] New Traffic Light Status incident · Kappture',
      message: expect.stringContaining('INC-87654321')
    }))
    const { message } = quickSend.mock.calls[0][1]
    expect(message).toContain('Till &lt;offline&gt;')
    expect(message).toContain('Till &amp; bar (T-01)')
    expect(message).toContain('href="https://example.com/photo.jpg"')
    expect(quickSend.mock.calls.map(([, email]) => email.to)).not.toContain('helpdesk@kappture.co.uk')
  })

  it('emails escalations from plain custom data with the linked incident ID and supplier', async () => {
    container.event = new Event({
      id: '12345678-escalation-id',
      federatedUserId: 'reporter-id',
      moreEventIds: ['87654321-incident-id']
    })
    container.customData = { Priority: 'P2 - Medium', Description: 'Still offline', Photo: 'javascript:alert(1)' }

    await connection.eventHooks.TRAFFIC_LIGHT_STATUS_INCIDENT_ESCALATE([], container)

    expect(quickSend).toHaveBeenCalledWith(container.rdic, expect.objectContaining({
      to: 'helpdesk@kappture.co.uk',
      subject: '[P2] Escalated Traffic Light Status incident · Kappture',
      message: expect.stringContaining('INC-87654321')
    }))
    const { message } = quickSend.mock.calls[0][1]
    expect(message).toContain('Still offline')
    expect(message).not.toContain('View uploaded photo')
    expect(container.createEvent).not.toHaveBeenCalled()
  })

  it.each([undefined, null, {}, new CustomData()])('uses email defaults for empty custom data (%p)', async customData => {
    container.customData = customData

    await connection.eventHooks.TRAFFIC_LIGHT_STATUS_INCIDENT_ESCALATE([], container)

    expect(quickSend).toHaveBeenCalledWith(container.rdic, expect.objectContaining({
      subject: '[P0] Escalated Traffic Light Status incident · Kappture',
      message: expect.stringContaining('No description supplied.')
    }))
    expect(quickSend.mock.calls[0][1].message).not.toContain('View uploaded photo')
  })
})
