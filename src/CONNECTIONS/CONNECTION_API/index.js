/* eslint-disable quotes */
const Connection = require('../Connection')
const makeRequest = require('./makeRequest')
const { deserialize } = require('openbox-node-utils')

const COLOR = '#322CBE'

function doFail (createEvent, message, { user, application }) {
  createEvent({
    type: 'CONNECTION_BAD',
    userId: user.id,
    applicationId: application.id,
    customData: { id: 'CONNECTION_API', message }
  })
}

async function eventHookLogic (config, eventHookContainer) {
  const { rdic, user, application, thing, customData, createEvent } = eventHookContainer
  const { partnerId } = user
  const { apiUrl } = rdic.get('environment')

  // customData {
  //   'Your photo': 'uploadImage:https://storage.googleapis.com/sticky-uploads/08b67284-79d3-4d05-867b-13230e8d6b6e.svg',
  //   'Name': 'Jack Sims',
  //   'Email': 'jack@sims.com',
  //   'Phone': '0 123 456 789',
  //   'Company': 'My company',
  //   'Address for free stickers': 'My\naddress'
  // }

  const yourPhoto = deserialize(customData['Your photo'])
  const body = {
    password: 'choose a new password 123',
    userType: 'GENERIC',

    name: `${customData['Name']} (${customData['Company']})`,
    email: customData['Email'],
    phone: customData['Phone'],
    address: customData['Address for free stickers'],
    partnerId
  }

  global.rdic.logger.log({}, '[CONNECTION_API]', { customData, apiUrl, yourPhoto, body })

  let privateKey
  try {
    ({ privateKey } = await makeRequest(undefined, 'post', `${apiUrl}/v1/users`, body))
  } catch (e) {
    doFail(createEvent, e.message, { user, application })
  }
  if (!privateKey) {
    return
  }

  await (async () => {
    await makeRequest(
      privateKey,
      'post',
      `${apiUrl}/v1/applications`,
      {
        name: 'My business card',
        backendLogic: 'return `${input.consumerAppUrl}/flow`;',
        events: {
          on_load: [
            {
              "id": "eab1198f-f924-442c-90d7-fca408ee9ef8",
              "config": {
                "what": "My business card",
                "colour": "#FF1F3E"
              }
            },
            {
              "id": "0433e4bf-bc53-42e1-bf1c-253a789a74d6",
              "config": {
                "label": customData['Name'],
                "ccName1": customData['Name'],
                "ccName2": "",
                "ccCompanyName": customData['Company'],
                "ccPhone": customData['Phone'],
                "ccEmail": customData['Email']
              }
            },
            {
              "id": "6121bb17-a3b4-4df4-b64e-1149ce4d7140",
              "config": {}
            },
            {
              "id": "6121bb17-a3b4-4df4-b64e-1149ce4d7140",
              "config": {}
            },
            {
              "id": "6121bb17-a3b4-4df4-b64e-1149ce4d7140",
              "config": {}
            },
            {
              "id": "0e1f0565-5e05-471c-b855-bbe44c20527d",
              "config": {
                "label": "Name",
                "type": " → Name",
                "value": "",
                "disabled": false,
                "required": false,
                "stashUser": false,
                "isHidden": false
              }
            },
            {
              "id": "0e1f0565-5e05-471c-b855-bbe44c20527d",
              "config": {
                "label": "Email",
                "type": " → Email",
                "value": "",
                "disabled": false,
                "required": false,
                "stashUser": false,
                "isHidden": false
              }
            },
            {
              "id": "0e1f0565-5e05-471c-b855-bbe44c20527d",
              "config": {
                "label": "Phone",
                "type": " → Phone",
                "value": "",
                "disabled": false,
                "required": false,
                "stashUser": false,
                "isHidden": false
              }
            },
            {
              "id": "0e1f0565-5e05-471c-b855-bbe44c20527d",
              "config": {
                "label": "Why should we keep in touch?",
                "type": "Long text",
                "value": "",
                "disabled": false,
                "required": false,
                "stashUser": false,
                "isHidden": false
              }
            },
            {
              "id": "a21eddf2-aa86-4b6a-a2af-8ac279b246f7",
              "config": {
                "action": "formSubmit~~||~~%%^^%%false%%^^%%%%^^%%#2f3542~~||~~false",
                "label": "Submit",
                "colour": "#FF1F3E",
                "foregroundColour": "#FFFFFF",
                "icon": "check",
                "fullWidth": false
              }
            }
          ]
        },
        baseIcon: 'https://cdn.sticky.to/application-bases/bb28b9f3-e1f7-4358-9155-b36996c3ccb5.svg',
        baseEventTypes: ['on_load'],
        baseSettingsRender: 'application-blocks',
        primaryColor: '#FF1F3E'
      }
    )
  })()

  thing && await (async () => {
    try {
      await makeRequest(
        user.privateKey,
        'post',
        `${apiUrl}/v2/trigger/move-thing`,
        {
          privateKey,
          thingId: thing.id
        }
      )
    } catch (e) {
      doFail(createEvent, e.message, { user, application })
    }
  })()
}

module.exports = new Connection({
  id: 'CONNECTION_API',
  name: 'Sticky API',
  shortName: 'API',
  color: COLOR,
  logo: cdn => `${cdn}/connections/CONNECTION_API.svg`,
  configNames: [],
  configDefaults: [],
  instructionsDone: 'Form submissions and touchpoints will now create Sticky accounts.',
  eventHooks: {
    'LD_V2': eventHookLogic,
    'CHECK_IN': eventHookLogic
  }
})
