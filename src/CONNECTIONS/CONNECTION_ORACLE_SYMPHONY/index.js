const { assert } = require('@stickyto/openbox-node-utils')

const crypto = require('crypto')
const Connection = require('../Connection')

async function abstractedPkceAuthorize ({ configHostAuthorize, clientId }) {
  console.log('--- STEP 1: Generate PKCE verifier ---')
  const codeVerifier = crypto.randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  console.log('code_verifier:', codeVerifier)
  console.log('\n--- STEP 2: Generate PKCE challenge ---')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier, 'ascii')
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  console.log('code_challenge:', codeChallenge)
  console.log('\n--- STEP 3: Build authorize URL ---')
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'openid',
    redirect_uri: 'apiaccount://callback',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  })
  const authorizeUrl = `${configHostAuthorize}/oidc-provider/v1/oauth2/authorize?${params.toString()}`
  console.log('authorize_url:', authorizeUrl)
  console.log('\n--- STEP 4: Call authorize endpoint ---')
  const res = await fetch(authorizeUrl, {
    method: 'GET',
    redirect: 'manual'
  })
  console.log('status:', res.status)
  console.log('\n--- STEP 5: Capture cookies ---')
  const setCookies = res.headers.getSetCookie
    ? res.headers.getSetCookie()
    : [res.headers.get('set-cookie')].filter(Boolean)
  console.log('set_cookie_headers:', setCookies)
  const cookieHeader = setCookies
    .map(c => c.split(';')[0])
    .join('; ')
  console.log('\nconstructed_cookie_header:', cookieHeader)
  console.log('\n--- STEP 6: Response diagnostics ---')
  console.log('location_header:', res.headers.get('location'))
  const bodyPreview = await res.text()
  console.log('body_preview:', bodyPreview.substring(0, 500))
  return {
    codeVerifier,
    codeChallenge,
    cookies: cookieHeader,
    rawCookies: setCookies
  }
}

async function abstractedSignIn ({
  configHostAuthorize,
  cookieHeader,
  username,
  password,
  orgname
}) {
  console.log('\n--- STEP 7: POST /signin ---')
  const url = `${configHostAuthorize}/oidc-provider/v1/oauth2/signin`
  const body = new URLSearchParams({
    username,
    password,
    orgname
  })
  console.log('signin_url:', url)
  console.log('request_body:', body.toString())
  console.log('cookie_header:', cookieHeader)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'cookie': cookieHeader
    },
    body
  })
  console.log('status:', res.status)
  const json = await res.json()
  console.log('response_json:', json)
  if (!json.success) {
    throw new Error('Oracle sign-in failed')
  }
  const redirectUrl = json.redirectUrl
  console.log('redirect_url:', redirectUrl)
  const code = new URL(redirectUrl).searchParams.get('code')
  console.log('authorization_code:', code)
  return code
}

async function abstractedToken ({
  configHostAuthorize,
  cookieHeader,
  clientId,
  codeVerifier,
  authCode,
  redirectUri = 'apiaccount://callback'
}) {
  console.log('\n--- STEP 8: POST /token ---')
  const url = `${configHostAuthorize}/oidc-provider/v1/oauth2/token`
  const body = new URLSearchParams({
    scope: 'openid',
    grant_type: 'authorization_code',
    client_id: clientId,
    code_verifier: codeVerifier,
    code: authCode,
    redirect_uri: redirectUri
  })
  console.log('token_url:', url)
  console.log('request_body:', body.toString())
  console.log('cookie_header:', cookieHeader)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'cookie': cookieHeader
    },
    body
  })
  console.log('status:', res.status)
  const setCookies = res.headers.getSetCookie
    ? res.headers.getSetCookie()
    : [res.headers.get('set-cookie')].filter(Boolean)
  console.log('set_cookie_headers:', setCookies)
  const json = await res.json()
  console.log('response_json:', json)
  return json
}

async function getLocations ({
  configHostApi,
  configOrgName,
  accessToken
}) {
  const url = `${configHostApi}/api/v1/organizations/${configOrgName}/locations`
  console.log('\n--- GET LOCATIONS ---')
  console.log('url:', url)
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'authorization': `Bearer ${accessToken}`,
      'accept': 'application/json'
    }
  })
  console.log('status:', res.status)
  const json = await res.json()
  console.log('response:', json)
  return json
}

async function getEmployees ({
  configHostApi,
  configLocation,
  accessToken
}) {
  const url = `${configHostApi}/api/v1/employees?locRef=${encodeURIComponent(configLocation)}`
  console.log('\n--- GET EMPLOYEES ---')
  console.log('url:', url)
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'authorization': `Bearer ${accessToken}`,
      'accept': 'application/json'
    }
  })
  console.log('status:', res.status)
  const json = await res.json()
  console.log('response:', json)
  return json
}

async function getRevenueCenters ({
  configHostApi,
  configOrgName,
  configLocation,
  accessToken
}) {
  const url = `${configHostApi}/api/v1/organizations/${encodeURIComponent(configOrgName)}/locations/${encodeURIComponent(configLocation)}/revenueCenters`
  console.log('\n--- GET REV CENS ---')
  console.log('url:', url)
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'authorization': `Bearer ${accessToken}`,
      'accept': 'application/json'
    }
  })
  console.log('status:', res.status)
  const json = await res.json()
  console.log('response:', json)
  return json
}

async function getChecks ({
  configHostApi,
  configOrgName,
  configLocation,
  accessToken,
  revenueCenter,
}) {
  const url = `${configHostApi}/api/v1/checks`
  console.log('\n--- GET CHECKS ---')
  console.log('url:', url)
  const x = {
    method: 'GET',
    headers: {
      'authorization': `Bearer ${accessToken}`,
      'accept': 'application/json',
      'Simphony-LocRef': configLocation,
      'Simphony-OrgShortName': configOrgName,
      'Simphony-RvcRef': revenueCenter
    }
  }
  console.warn('xxx x', x)
  const res = await fetch(url, x)
  console.log('status:', res.status)
  const json = await res.json()
  console.log('response:', json)
  return json
}

async function placeOrder ({
  configHostApi,
  configOrgName,
  configLocation,
  accessToken,
  revenueCenter,
  payload
}) {
  const url = `${configHostApi}/api/v1/checks`
  console.log('\n--- PLACE ORDER ---')
  console.log('url:', url)
  console.log('payload:', JSON.stringify(payload, null, 2))

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'Simphony-LocRef': configLocation,
      'Simphony-OrgShortName': configOrgName,
      'Simphony-RvcRef': revenueCenter
    },
    body: JSON.stringify(payload)
  })
  console.log('status:', res.status)
  const json = await res.json()
  console.log('response:', json)
  return json
}

async function eventHookLogic (config, connectionContainer) {
  const { event, payment, user, application, thing, session, createEvent } = connectionContainer
  const [configClientId, configUsername, configPassword, configOrgName, configLocation, configHostAuthorize, configHostApi] = config

  try {
    const auth = await abstractedPkceAuthorize({
      configHostAuthorize,
      clientId: configClientId
    })

    const code = await abstractedSignIn({
      configHostAuthorize,
      cookieHeader: auth.cookies,
      username: configUsername,
      password: configPassword,
      orgname: configOrgName
    })

    const token = await abstractedToken({
      configHostAuthorize,
      cookieHeader: auth.cookies,
      clientId: configClientId,
      codeVerifier: auth.codeVerifier,
      authCode: code
    })

    console.log('\n--- FINAL TOKEN RESPONSE ---')
    console.log(token)

    const locations = await getLocations({
      configHostApi,
      configOrgName,
      accessToken: token.access_token
    })

    console.log('\n--- FINAL LOCATIONS RESPONSE ---')
    console.log(locations)

    const foundLocation = locations.items.find(_ => _.locRef === configLocation)
    assert(foundLocation, `There is no location with locRef "${configLocation}". The valid locRefs are [${locations.items.map(_ => _.locRef).join(' / ')}].`)

    assert(application.theirId, `You must set the "External system ID" field for flow "${application.name}" as your revenue center.`)

    const revenueCenters = await getRevenueCenters({
      configHostApi,
      configOrgName,
      configLocation,
      configOrgName,
      accessToken: token.access_token,
      revenueCenter: application.theirId,
    })

    console.log('\n--- FINAL REV CEN RESPONSE ---')
    console.log(revenueCenters)

    const checks = await getChecks({
      configHostApi,
      configOrgName,
      configLocation,
      configOrgName,
      accessToken: token.access_token,
      revenueCenter: application.theirId,
    })

    console.log('\n--- FINAL CHECKS RESPONSE ---')
    console.log(checks)

    // const employees = await getEmployees({
    //   configHostApi,
    //   configLocation,
    //   accessToken: token.access_token
    // })

    // console.log('\n--- FINAL EMPLOYEES RESPONSE ---')
    // console.log(employees)

    await placeOrder({
      configHostApi,
      configOrgName,
      configLocation,
      configOrgName,
      accessToken: token.access_token,
      revenueCenter: application.theirId,
      payload: {
        'header': {
          'rvcRef': parseInt(application.theirId, 10),
          'orgShortName': configOrgName,
          'locRef': configLocation,
          'checkRef': payment.id,
          'checkEmployeeRef': 1,
          'orderTypeRef': 1,
          'orderChannelRef': 1,
          'tableName': '1',
          'status': 'open',
          'IdempotencyId': payment.id,
          // 'checkNumber': 20122326,
          // 'tableGroupNumber': 11,
          // 'openTime': '2026-03-30T14:47:40.743',
          // 'preparationStatus': 'Submitted'
        },
        'menuItems': [
          {
            'menuItemId': 200010047,
            'definitionSequence': 1,
            'name': 'Tasty Pizza',
            'quantity': 1,
            'unitPrice': 8.0000,
            'priceSequence': 1,
            'total': 8.0000,
            'seat': 1,
            'surcharge': 0,
            'condiments': []
          }
        ]
        // 'totals': {
        //   'subtotal': 7.5000,
        //   'subtotalDiscountTotal': 0,
        //   'autoServiceChargeTotal': 1.01,
        //   'serviceChargeTotal': 0,
        //   'taxTotal': 0,
        //   'paymentTotal': 0,
        //   'totalDue': 8.5100
        // }
        // 'extensions': [],
        // 'taxes': [
        //   {
        //     'taxRateId': 1,
        //     'name': 'VAT 20%',
        //     'total': 1.25
        //   }
        // ],
        // 'tenders': [
        //   {
        //     'tenderId': 1,
        //     'name': 'string',
        //     'total': 0,
        //     'chargedTipTotal': 0,
        //     'referenceText': 'string'
        //   }
        // ]
      }
    })

    createEvent({
      type: 'CONNECTION_GOOD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      thingId: thing ? thing.id : undefined,
      customData: { id: 'CONNECTION_ORACLE_SYMPHONY' }
    })
  } catch (e) {
    payment.onSessionFail(rdic, user, { whichConnection: 'CONNECTION_ORACLE_SYMPHONY' }, { customSubject: '⚠️ Your {name} order was not successful', customMessage: '<p>We are sorry but your {name} order was not successful.</p>' })
    createEvent({
      type: 'CONNECTION_BAD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      thingId: thing ? thing.id : undefined,
      customData: { id: 'CONNECTION_ORACLE_SYMPHONY', message: e.message }
    })
  }
}

module.exports = new Connection({
  id: 'CONNECTION_ORACLE_SYMPHONY',
  type: 'CONNECTION_TYPE_POINT_OF_SALE',
  name: 'Simphony',
  color: '#E32124',
  logo: cdn => `${cdn}/connections/CONNECTION_ORACLE_SYMPHONY.svg`,
  configNames: ['Client ID', 'Username', 'Password', 'Org short ID', 'Location', 'Authorization host', 'API host'],
  configDefaults: ['', '', '', '', '', '', ''],
  eventHooks: {
    'SESSION_CART_PAY': eventHookLogic
  }
})
