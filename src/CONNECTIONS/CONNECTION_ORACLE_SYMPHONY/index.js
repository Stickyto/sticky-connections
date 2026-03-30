const crypto = require('crypto')
const Connection = require('../Connection')

const HOST_AUTHORIZE = 'https://mte4-ohra-idm.oracleindustry.com'
const HOST_API = 'https://mte4-sts.oraclecloud.com'

async function abstractedPkceAuthorize (clientId) {
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
  const authorizeUrl =
    `${HOST_AUTHORIZE}/oidc-provider/v1/oauth2/authorize?${params.toString()}`
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
  cookieHeader,
  username,
  password,
  orgname
}) {
  console.log('\n--- STEP 7: POST /signin ---')
  const url = `${HOST_AUTHORIZE}/oidc-provider/v1/oauth2/signin`
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
  cookieHeader,
  clientId,
  codeVerifier,
  authCode,
  redirectUri = 'apiaccount://callback'
}) {
  console.log('\n--- STEP 8: POST /token ---')
  const url = `${HOST_AUTHORIZE}/oidc-provider/v1/oauth2/token`
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
  basePath,
  orgShortName,
  accessToken
}) {
  const url = `${basePath}/api/v1/organizations/${orgShortName}/locations`
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

async function eventHookLogic (config, connectionContainer) {
  const { event, payment, user, application, thing, session, createEvent } = connectionContainer
  const [configClientId, configUsername, configPassword, configOrgName] = config

  const auth = await abstractedPkceAuthorize(configClientId)

  const code = await abstractedSignIn({
    cookieHeader: auth.cookies,
    username: configUsername,
    password: configPassword,
    orgname: configOrgName
  })

  const token = await abstractedToken({
    cookieHeader: auth.cookies,
    clientId: configClientId,
    codeVerifier: auth.codeVerifier,
    authCode: code
  })

  console.log('\n--- FINAL TOKEN RESPONSE ---')
  console.log(token)

  const locations = await getLocations({
    basePath: HOST_API,
    orgShortName: configOrgName,
    accessToken: token.access_token
  })

  console.log('\n--- FINAL LOCATIONS RESPONSE ---')
  console.log(locations)
}

module.exports = new Connection({
  id: 'CONNECTION_ORACLE_SYMPHONY',
  type: 'CONNECTION_TYPE_POINT_OF_SALE',
  name: 'Symphony',
  color: '#E32124',
  logo: cdn => `${cdn}/connections/CONNECTION_ORACLE_SYMPHONY.svg`,
  configNames: ['Client ID', 'Username', 'Password', 'Org short ID'],
  configDefaults: ['', '', '', ''],
  eventHooks: {
    'SESSION_CART_PAY': eventHookLogic
  }
})
