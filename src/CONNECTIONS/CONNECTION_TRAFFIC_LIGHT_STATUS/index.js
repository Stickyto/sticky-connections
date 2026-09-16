const Connection = require('../Connection')
const { deserialize, isUrl, services } = require('@stickyto/openbox-node-utils')
const { encode } = require('html-entities')

const ALL_EMAILS = JSON.parse(Buffer.from('WyJzdXBwb3J0QHN0aWNreS50byIsImFzaGxleS53aWxzb25AY29tcGFzcy1ncm91cC5jby51ayIsInplZS5rYXJpbUBsZXZ5LmNvLnVrIiwiaGFycnkucmlkbGV5QGxldnkuY28udWsiLCJrZXZpbi5tYWluYUBsZXZ5LmNvLnVrIiwiYW55YXdpbGxyb3NlMTJAZ21haWwuY29tIiwic2Fha3NoaXNoZXR0eUBnbWFpbC5jb20iLCJtb3NhYmJpci5zLmFkaWJAc3R1Lm1tdS5hYy51ayIsImFvZ3VubW95ZUBnbWFpbC5jb20iXQ==', 'base64').toString('utf8'))

const SYSTEMS = [
  {
    id: 'KAPPTURE',
    name: 'Kappture',
    color: '#e72077',
    sla: 1200,
    emails: [
      'helpdesk@kappture.co.uk'
    ]
  },
  {
    id: 'BRISK',
    name: 'Brisk',
    color: '#e72077',
    sla: 1200,
    emails: [
      'helpdesk@kappture.co.uk'
    ]
  },
  {
    id: 'LINNEY',
    name: 'Linney',
    color: '#333333',
    sla: 1200,
    emails: []
  },
  {
    id: 'BOXBAR',
    name: 'Boxbar',
    color: '#ff00bf',
    sla: 1200,
    emails: [
      'support@boxbar.live'
    ]
  },
  {
    id: 'STICKY',
    name: 'Sticky',
    color: '#211552',
    sla: 1200,
    emails: [
      'support@sticky.to'
    ]
  },
  {
    id: 'LEVY',
    name: 'Levy',
    color: '#000000',
    sla: 1200,
    emails: []
  },
  {
    id: 'LEAD',
    name: 'Lead',
    color: '#322cbe',
    emails: [
    ]
  },
  {
    id: 'MU_IT',
    name: '44187 [MU] IT',
    color: '#C50317',
    sla: 1200,
    emails: [
    ]
  },
  {
    id: 'MU_NETWORK',
    name: '44187 [MU] Network',
    color: '#C50317',
    sla: 1200,
    emails: [
    ]
  }
]

module.exports = new Connection({
  id: 'CONNECTION_TRAFFIC_LIGHT_STATUS',
  name: 'Traffic Light Status',
  type: 'CONNECTION_TYPE_ERP',
  partnerNames: ['Traffic Light Status', 'Compass Group'],
  color: '#1e272e',
  logo: cdn => `${cdn}/connections/CONNECTION_TRAFFIC_LIGHT_STATUS.svg`,
  configNames: ['Systems (comma separated id keys)'],
  configDefaults: [''],
  instructions: () => [
    {
      "id": "71d05208-3781-4c24-996e-c4c0d1c6b228",
      "config": {
        "what": JSON.stringify(SYSTEMS.map(_ => ({ id: _.id, name: _.name, color: _.color, sla: _.sla, slaAcknowledgement: typeof _.slaAcknowledgement === 'number' ? _.slaAcknowledgement : _.sla, slaResolve: typeof _.slaResolve === 'number' ? _.slaResolve : _.sla })), null, 2),
        "font": "#1e272e--left--80%--false",
        "backgroundColour": "#FFFFFF"
      }
    }
  ],
  eventHooks: {
    'LD_V2': async function (config, connectionContainer) {
      const { rdic, event, user, application, thing, customData, createEvent } = connectionContainer
      const ignoreThing = !thing || !thing.customData.get('Traffic Light Status system')
      if (ignoreThing) {
        return
      }
      const systemId = thing.customData.get('Traffic Light Status system')
      const system = SYSTEMS.find(_ => _.id === systemId)
      const whichFu = await rdic.dlGetFederatedUser({ userId: user.id, federatedUserId: event.federatedUserId })
      console.warn('[DebugLaterTls] event', event)
      console.warn('[DebugLaterTls] whichFu', whichFu)
      console.warn('[DebugLaterTls] customData', customData)
      const incident = await createEvent({
        type: 'TRAFFIC_LIGHT_STATUS_INCIDENT',
        userId: user.id,
        applicationId: application ? application.id : undefined,
        thingId: thing ? thing.id : undefined,
        federatedUserId: whichFu ? whichFu.id : undefined,
        linearData: [systemId],
        customData: {
          'Priority': (customData['This is a...'] || 'P0').slice(0, 2),
          'Photo': customData['What can you see?'],
          'Description': customData['Anything else we should know?']
        }
      })
      if (system && Array.isArray(system.emails)) {
        const emails = [...new Set([...ALL_EMAILS, ...system.emails, whichFu && whichFu.email].filter(_ => _))]
        const priority = (customData['This is a...'] || 'P0').slice(0, 2)
        const description = customData['Anything else we should know?'] || 'No description supplied.'
        const photoUrl = deserialize(customData['What can you see?'], user, true)
        const photoLink = typeof photoUrl === 'string' && isUrl(photoUrl)
          ? `<p><a href="${encode(photoUrl)}"><strong>View uploaded photo</strong></a></p>`
          : ''
        const subject = `[${priority}] New Traffic Light Status incident · ${system.name}`
        const message = `
<p><strong>INC-${incident.id.substring(0, 8).toUpperCase()}</strong></p>
<p><strong>System:</strong> ${encode(system.name)}</p>
<p><strong>Asset:</strong> ${encode(thing.name)} (${encode(thing.theirId)})</p>
<p><strong>Priority:</strong> ${encode(priority)}</p>
<p><strong>Description:</strong> ${encode(description)}</p>
${photoLink}
`
        await Promise.all(emails.map(to => services.mail.quickSend(rdic, { user, subject, message, to })))
      }
    }
  }
})
