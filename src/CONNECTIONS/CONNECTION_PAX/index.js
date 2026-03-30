const Connection = require('../Connection')

const COLOR = '#07055B'

module.exports = new Connection({
  id: 'CONNECTION_PAX',
  type: 'CONNECTION_TYPE_CHP',
  name: 'PAX',
  color: COLOR,
  logo: cdn => `${cdn}/connections/CONNECTION_PAX.svg`,
  configNames: ['Terminal Address', 'Terminal Serial', 'Pairing Code', 'Auth token'],
  configDefaults: ['', '', ''],
  instructions: ({ rdic, user, applications }) => [
    {
      "id": "eab1198f-f924-442c-90d7-fca408ee9ef8",
      "config": {
        "what": "On terminal",
        "type": "Subheading",
        "colour": COLOR
      }
    },
    {
      'id': '71d05208-3781-4c24-996e-c4c0d1c6b228',
      'config': {
        'what': [
          'Press "..." (three dots) icon at top right',
          'Press the relevant "Pair" button for the terminal index you are working on - if unsure, "Pair 0" is the one to choose.'
        ]
          .join('\n\n'),
        'font': `${COLOR}--center--100%--false`
      }
    },
    {
      "id": "eab1198f-f924-442c-90d7-fca408ee9ef8",
      "config": {
        "what": "This screen",
        "type": "Subheading",
        "colour": COLOR
      }
    },
    {
      'id': '71d05208-3781-4c24-996e-c4c0d1c6b228',
      'config': {
        'what': [
          'Enter all information shown on terminal and leave "Auth token" blank',
          'Press "Save" (flashing in red)',
          'Press "Press me" (below); skip security warning, copy "authToken" field and close new tab'
        ]
          .join('\n\n'),
        'font': `${COLOR}--center--100%--false`
      }
    },
    {
      "id": "a21eddf2-aa86-4b6a-a2af-8ac279b246f7",
      "config": {
        "label": "Pair 0",
        "action": "~~||~~~~||~~false",
        "colour": COLOR,
        "foregroundColour": "#FFFFFF",
        "icon": "loading",
        "fullWidth": false,
        "dropShadowAndRoundedCorners": true,
        "letterSpacing": 1,
        "backgroundImage": "",
        "bottomMargin": 16
      }
    },
    {
      "id": "a21eddf2-aa86-4b6a-a2af-8ac279b246f7",
      "config": {
        "label": "Pair 1",
        "action": "~~||~~~~||~~false",
        "colour": COLOR,
        "foregroundColour": "#FFFFFF",
        "icon": "loading",
        "fullWidth": false,
        "dropShadowAndRoundedCorners": true,
        "letterSpacing": 1,
        "backgroundImage": "",
        "bottomMargin": 16
      }
    },
    {
      "id": "a21eddf2-aa86-4b6a-a2af-8ac279b246f7",
      "config": {
        "label": "Pair 2",
        "action": "~~||~~~~||~~false",
        "colour": COLOR,
        "foregroundColour": "#FFFFFF",
        "icon": "loading",
        "fullWidth": false,
        "dropShadowAndRoundedCorners": true,
        "letterSpacing": 1,
        "backgroundImage": "",
        "bottomMargin": 16
      }
    },
    {
      "id": "a21eddf2-aa86-4b6a-a2af-8ac279b246f7",
      "config": {
        "label": "Pair 3",
        "action": "~~||~~~~||~~false",
        "colour": COLOR,
        "foregroundColour": "#FFFFFF",
        "icon": "loading",
        "fullWidth": false,
        "dropShadowAndRoundedCorners": true,
        "letterSpacing": 1,
        "backgroundImage": "",
        "bottomMargin": 16
      }
    },
    {
      'id': '71d05208-3781-4c24-996e-c4c0d1c6b228',
      'config': {
        'what': [
          'Paste into "Auth token" box',
          'Press "Save" (flashing in red)'
        ]
          .join('\n\n'),
        'font': `${COLOR}--center--100%--false`
      }
    },
    {
      'id': '32f0e11d-1271-4ade-b6a5-1e47de1221b9',
      'config': {}
    }
  ]
})
