const { assert } = require('@stickyto/openbox-node-utils')

const crypto = require('node:crypto')
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
  const { items } = await res.json()
  console.log('response:', items)
  return items
}

async function getTenders ({
  configHostApi,
  configOrgName,
  configLocation,
  revenueCenter,
  accessToken
}) {
  const url = `${configHostApi}/api/v1/tenders/collection?orgShortName=${configOrgName}&locRef=${configLocation}&rvcRef=${revenueCenter}`
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
  const { items } = await res.json()
  console.log('response:', items)
  return items
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
  configEmployeeNumber,
  accessToken,
  revenueCenter,
  payload
}) {
  const url = `${configHostApi}/api/v1/checks`
  console.log('\n--- PLACE ORDER ---')
  console.log('[placeOrder] url:', url)
  console.log('[placeOrder] payload:', JSON.stringify(payload, null, 2))

  const res = await fetch(
    url,
    {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${accessToken}`,
        'content-type': 'application/json',
        'Simphony-LocRef': configLocation,
        'Simphony-OrgShortName': configOrgName,
        'Simphony-RvcRef': revenueCenter
      },
      body: JSON.stringify(payload)
    }
  )
  console.log('[placeOrder] status:', res.status)
  const json = await res.json()
  console.log('[placeOrder] response:', json)
  assert(res.status === 200, JSON.stringify(json, null, 2))
  return json
}

async function eventHookLogic (config, connectionContainer) {
  const { event, payment, user, application, thing, createEvent, customData } = connectionContainer
  const [configClientId, configUsername, configPassword, configOrgName, configLocation, configHostAuthorize, configHostApi, configEmployeeNumber, configTender] = config

  assert(application, 'There is no flow.')
  assert(customData.cart.length > 0, 'The bag is empty.')

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

    const revenueCenters = await getRevenueCenters({
      configHostApi,
      configOrgName,
      configLocation,
      accessToken: token.access_token,
      revenueCenter: application.theirId,
    })
    console.log('\n--- FINAL REV CEN RESPONSE ---')
    console.log(JSON.stringify(revenueCenters, null, 2))
    assert(application.theirId, `You must set the "External system ID" field for flow "${application.name}" as your revenue center.`)
    const foundRevenueCenter = revenueCenters.find(_ => _.rvcRef.toString() === application.theirId)
    assert(foundRevenueCenter, `There is no revenue center with rvcRef "${application.theirId}". The valid revenue centers are [${revenueCenters.map(_ => `${_.rvcRef} (${_.name})`).join(' / ')}].`)
    assert(foundRevenueCenter.orderTypes.length > 0, `Revenue center with rvcRef "${application.theirId}" does not contain any orderTypes.`)

    const tenders = await getTenders({
      configHostApi,
      configOrgName,
      configLocation,
      revenueCenter: application.theirId,
      accessToken: token.access_token
    })
    console.log('\n--- FINAL TENDERS RESPONSE ---')
    console.log(tenders)
    const foundTender = tenders.find(_ => _.tenderId.toString() === configTender)
    assert(foundTender, `There is no tender with tenderId "${configTender}". The valid tenders are [${tenders.map(_ => `${_.tenderId} (${_.name})`).join(' / ')}].`)

    // const checks = await getChecks({
    //   configHostApi,
    //   configOrgName,
    //   configLocation,
    //   configOrgName,
    //   accessToken: token.access_token,
    //   revenueCenter: application.theirId,
    // })

    // console.log('\n--- FINAL CHECKS RESPONSE ---')
    // console.log(checks)

    // const employees = await getEmployees({
    //   configHostApi,
    //   configLocation,
    //   accessToken: token.access_token
    // })

    // console.log('\n--- FINAL EMPLOYEES RESPONSE ---')
    // console.log(employees)

    // HEADER: 'checkNumber': 20122326,
    // HEADER: 'tableGroupNumber': 11,
    // HEADER: 'openTime': '2026-03-30T14:47:40.743',
    // HEADER: 'preparationStatus': 'Submitted' // [ "Uninitialized", "Submitted", "Prepared", "AllPrepared", "Packaged" ]
    // HEADER: 'status': 'closed' // [ "open", "closed" ] // TRY: customData.gateway !== 'GATEWAY_NOOP'

    const poPayload = {
      'header': {
        'rvcRef': parseInt(application.theirId, 10),
        'orgShortName': configOrgName,
        'locRef': configLocation,
        'checkRef': payment.id,
        'checkEmployeeRef': configEmployeeNumber,
        'orderTypeRef': foundRevenueCenter.orderTypes[0].orderTypeRef,
        'tableName': thing ? thing.name : '(No sticky)',
        'IdempotencyId': payment.id,
        'status': 'closed',
        'orderChannelRef': 1
      },
      'tenders': [
        {
          'tenderId': foundTender.tenderId,
          'name': foundTender.name,
          'total': payment.total / 100,
          'chargedTipTotal': payment.tip / 100,
          'referenceText': payment.id
        }
      ],
      'menuItems': customData.cart
        .filter(ci => ci.productTheirId)
        .map(ci => ({
          'menuItemId': parseInt(ci.productTheirId, 10),
          'name': ci.productName,
          'quantity': ci.quantity,
          'unitPrice': ci.productPrice / 100,
          'total': ((ci.productPrice / 100) * ci.quantity),
          'condiments': []
        }))
    }

    console.warn('[DebugOracle] customData.cart', JSON.stringify(customData.cart, null, 2))
    console.warn('[DebugOracle] poPayload', JSON.stringify(poPayload, null, 2))

    const { header: { checkNumber, checkRef } } = await placeOrder({
      configHostApi,
      configOrgName,
      configLocation,
      configOrgName,
      configEmployeeNumber,
      accessToken: token.access_token,
      revenueCenter: application.theirId,
      payload: poPayload
    })

    // {
    //     productId: 'f105cff1-def8-4379-bd4b-4a6719d896db',
    //     productName: 'Test Coffee',
    //     productPrice: 1,
    //     productCurrency: 'GBP',
    //     productTheirId: '200060062',
    //     quantity: 1,
    //     questions: []
    //   }

    // {
    //     "description":"Check condiment items.\n<p>When default condiments are included on a menu item when creating or appending to a check they will be flagged appropriately allowing OPS/order device/receipt output to choose to display or not display the items based on configuration (default condiments on menu item definition Option Bits, option 1 - select to display defaults, deselect to not display defaults)</p>\n",
    //     "type":"object",
    //     "required":[
    //         "condimentId",
    //         "definitionSequence"
    //     ],
    //     "properties":{
    //         "condimentId":{
    //             "description":"The menu item's POS identifier.",
    //             "type":"integer"
    //         },
    //         "prefixes":{
    //             "description":"Array of prefixes applied to the condiment.<p>First available version: STS Gen2 1.7.1</p>",
    //             "type":"array",
    //             "items":{
    //                 "$ref":"#/definitions/prefixes"
    //             }
    //         },
    //         "definitionSequence":{
    //             "description":"The menu item definition sequence identifier. Indicates the definition of item that is used. This value is ignored on Oracle.RES platform.",
    //             "type":"integer"
    //         },
    //         "name":{
    //             "description":"The name of the menu item defined in the POS.",
    //             "type":"string"
    //         },
    //         "quantity":{
    //             "description":"The quantity of this item. If present minimum value is 1.",
    //             "type":"number"
    //         },
    //         "unitPrice":{
    //             "description":"The price that should be used for the item.",
    //             "type":"number"
    //         },
    //         "priceSequence":{
    //             "description":"The price sequence number to set the appropriate price level.",
    //             "type":"integer"
    //         },
    //         "total":{
    //             "description":"Amount of item for the specified quantity.",
    //             "type":"number"
    //         },
    //         "seat":{
    //             "description":"Seat number of item on the check. <p>Seat is ignored when set for comboItem, mainItem, and sideItems. Response will always return \"seat\": 0. Seat for the combo meals should be defined at the comboMeal level.</p>",
    //             "type":"integer"
    //         },
    //         "referenceText":{
    //             "description":"Additional text associated with the item.  ",
    //             "type":"string"
    //         },
    //         "surcharge":{
    //             "description":"Surcharge amount.",
    //             "type":"number"
    //         },
    //         "isDefault":{
    //             "description":"Flag indicating if condiment prefix is default. (response only) <p>First available version: STS Gen2 1.7.1</p>",
    //             "type":"boolean"
    //         },
    //         "atDefaultSetting":{
    //             "description":"Flag indicating if condiment prefix was added by default by the configuration Default Count in Simphony. (response only) <p>First available version: STS Gen2 1.7.1</p>",
    //             "type":"boolean"
    //         },
    //         "itemDiscounts":{
    //             "description":"Array of discounts applied to the menu item.",
    //             "type":"array",
    //             "items":{
    //                 "$ref":"#/definitions/CheckDiscountItem"
    //             }
    //         }
    //     }
    // }

    createEvent({
      type: 'CONNECTION_GOOD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      thingId: thing ? thing.id : undefined,
      customData: { id: 'CONNECTION_ORACLE_SYMPHONY', theirId: `${checkNumber} / ${checkRef}` }
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
  configNames: ['Client ID', 'Username', 'Password', 'Org short ID', 'Location', 'Authorization host', 'API host', 'Employee number', 'Tender number'],
  configDefaults: ['', '', '', '', '', '', '', '', ''],
  eventHooks: {
    'SESSION_CART_PAY': eventHookLogic
  }
})
