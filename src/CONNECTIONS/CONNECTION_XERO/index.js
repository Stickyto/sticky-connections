const { isUuid, assert, uuid } = require('@stickyto/openbox-node-utils')

const crypto = require('node:crypto')

const Connection = require('../Connection')

const TOKEN_URL = 'https://identity.xero.com/connect/token'
const API_BASE_URL = 'https://api.xero.com/api.xro/2.0'
const REQUEST_TIME = 15 * 1000

const tokenCache = new Map()

async function postXeroInvoicePayment ({
  configClientId,
  configClientSecret,
  configAccountName,
  paymentUserPaymentId,
  paymentTotal,
  paymentCurrency,
  paymentId
}) {
  const paymentDate = new Date().toISOString().slice(0, 10)

  assertNonEmptyString(configClientId, "configClientId")
  assertNonEmptyString(configClientSecret, "configClientSecret")

  assertNonEmptyString(configAccountName, "configAccountName")
  assertNonEmptyString(paymentUserPaymentId, "paymentUserPaymentId")

  const amount = paymentTotal / 100

  const normalizedConfigClientId = configClientId.trim()

  const accessToken = await getAccessToken({
    configClientId: normalizedConfigClientId,
    configClientSecret
  })

  const accountId = await resolveAccountId({
    accessToken,
    configAccountName: configAccountName.trim()
  })

  const invoice = await resolveInvoiceByNumber({
    accessToken,
    paymentUserPaymentId: paymentUserPaymentId.trim()
  })

  validateInvoice(invoice, {
    paymentAmount: amount,
    paymentCurrency
  })

  const invoiceId = invoice.InvoiceID

  const idempotencyKey = createIdempotencyKey({
    configClientId: normalizedConfigClientId,
    paymentId
  })

  const body = {
    Invoice: {
      InvoiceID: invoiceId
    },
    Account: {
      AccountID: accountId
    },
    Date: paymentDate,
    Amount: amount,
    Reference: paymentId
  }

  const xeroResponse = await xeroApiRequest({
    accessToken,
    url: `${API_BASE_URL}/Payments`,
    method: "POST",
    operation: "create the Xero payment",
    headers: {
      "Idempotency-Key": idempotencyKey
    },
    body
  })

  const payment = extractPayment(xeroResponse)

  return {
    paymentId: payment?.PaymentID || null,
    invoiceId,
    accountId,
    amount,
    paymentDate,
    paymentStatus: payment?.Status || null,
    xeroResponse
  }
}

async function getAccessToken ({
  configClientId,
  configClientSecret
}) {
  const secretFingerprint = crypto
    .createHash("sha256")
    .update(configClientSecret)
    .digest("hex")

  const cached = tokenCache.get(configClientId)
  const now = Date.now()

  if (
    cached &&
    cached.secretFingerprint === secretFingerprint &&
    cached.expiresAt > now + 60 * 1000
  ) {
    return cached.accessToken
  }

  const basicCredentials = Buffer.from(
    `${configClientId}:${configClientSecret}`,
    "utf8"
  ).toString("base64")

  const response = await request({
    url: TOKEN_URL,
    method: "POST",
    operation: "obtain a Xero access token",
    headers: {
      Authorization: `Basic ${basicCredentials}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  })

  const accessToken = response.data?.access_token
  const expiresIn = Number(response.data?.expires_in)

  assert(
    typeof accessToken === "string" && accessToken.length > 0,
    "Xero token response did not contain access_token"
  )

  assert(
    Number.isFinite(expiresIn) && expiresIn > 0,
    "Xero token response contained an invalid expires_in value"
  )

  tokenCache.set(configClientId, {
    accessToken,
    expiresAt: now + expiresIn * 1000,
    secretFingerprint
  })

  return accessToken
}

async function resolveAccountId ({
  accessToken,
  configAccountName
}) {
  const normalizedName = configAccountName.trim().toLowerCase()

  const response = await xeroApiRequest({
    accessToken,
    url: `${API_BASE_URL}/Accounts`,
    method: "GET",
    operation: "retrieve Xero accounts"
  })

  const accounts = Array.isArray(response?.Accounts)
    ? response.Accounts
    : []

  const eligibleAccounts = accounts.filter((account) => {
    const isActive =
      !account?.Status ||
      String(account.Status).toUpperCase() === "ACTIVE"

    const canReceivePayments =
      String(account?.Type || "").toUpperCase() === "BANK" ||
      account?.EnablePaymentsToAccount === true

    return isActive && canReceivePayments
  })

  const matches = eligibleAccounts.filter((account) => {
    return typeof account?.Name === "string" &&
      account.Name.trim().toLowerCase() === normalizedName
  })

  const accountOptions = eligibleAccounts
    .map((account) => account?.Name)
    .filter(Boolean)
    .join(" / ")

  assert(
    matches.length > 0,
    `No active payment-capable Xero account named "${configAccountName}" was found. Options: ${accountOptions || "none"}`
  )

  assert(
    matches.length === 1,
    `Multiple eligible Xero accounts are named "${configAccountName}" the account name must be unique`
  )

  const accountId = matches[0].AccountID

  assert(
    isUuid(accountId),
    "resolved Xero AccountID must be a UUID"
  )

  return accountId
}

async function resolveInvoiceByNumber ({
  accessToken,
  paymentUserPaymentId
}) {
  const escapedPaymentUserPaymentId = paymentUserPaymentId
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')

  const url = new URL(`${API_BASE_URL}/Invoices`)

  url.searchParams.set(
    "where",
    `InvoiceNumber=="${escapedPaymentUserPaymentId}"`
  )

  const response = await xeroApiRequest({
    accessToken,
    url: url.toString(),
    method: "GET",
    operation: `retrieve Xero invoice "${paymentUserPaymentId}"`
  })

  const invoices = Array.isArray(response?.Invoices)
    ? response.Invoices
    : []

  assert(
    invoices.length > 0,
    `No Xero invoice numbered "${paymentUserPaymentId}" was found`
  )

  assert(
    invoices.length === 1,
    `Multiple Xero invoices numbered "${paymentUserPaymentId}" were found; the invoice number must be unique`
  )

  assert(
    isUuid(invoices[0].InvoiceID),
    "resolved Xero InvoiceID must be a UUID"
  )

  return invoices[0]
}

function validateInvoice (
  invoice,
  {
    paymentAmount,
    paymentCurrency
  }
) {
  const type = String(invoice?.Type || "").toUpperCase()
  const status = String(invoice?.Status || "").toUpperCase()
  const amountDue = Number(invoice?.AmountDue)

  const invoiceCurrency = String(
    invoice?.CurrencyCode || ""
  ).toUpperCase()

  const invoiceReference =
    invoice?.InvoiceNumber || invoice?.InvoiceID || "unknown"

  assert(
    type === "ACCREC",
    `Xero invoice ${invoiceReference} is not an accounts-receivable invoice`
  )

  assert(
    status === "AUTHORISED",
    `Xero invoice ${invoiceReference} has status ${status || "UNKNOWN"}, not AUTHORISED`
  )

  assert(
    Number.isFinite(amountDue) && amountDue > 0,
    `Xero invoice ${invoiceReference} has no positive outstanding balance`
  )

  assert(
    paymentAmount - amountDue <= 0.000001,
    `Payment amount ${paymentAmount} exceeds Xero AmountDue ${amountDue}`
  )

  assert(
    !paymentCurrency ||
      !invoiceCurrency ||
      paymentCurrency === invoiceCurrency,
    `Payment currency ${paymentCurrency} does not match Xero invoice currency ${invoiceCurrency}`
  )
}

async function xeroApiRequest ({
  accessToken,
  url,
  method,
  operation,
  headers = {},
  body
}) {
  const response = await request({
    url,
    method,
    operation,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(body === undefined
        ? {}
        : {
            "Content-Type": "application/json"
          }),
      ...headers
    },
    body:
      body === undefined
        ? undefined
        : JSON.stringify(body)
  })

  return response.data
}

async function request ({
  url,
  method,
  operation,
  headers,
  body
}) {
  const abortController = new AbortController()

  const timeout = setTimeout(
    () => abortController.abort(),
    REQUEST_TIME
  )

  let response

  try {
    response = await fetch(url, {
      method,
      headers,
      body,
      signal: abortController.signal
    })
  } catch (cause) {
    assert(
      cause?.name !== "AbortError",
      `Timed out after ${REQUEST_TIME}ms while attempting to ${operation}`
    )

    throw new Error(
      `Network error while attempting to ${operation}: ${
        cause?.message || String(cause)
      }`
    )
  } finally {
    clearTimeout(timeout)
  }

  let rawBody

  try {
    rawBody = await response.text()
  } catch {
    throw new Error(
      `Could not read Xero's response while attempting to ${operation}`
    )
  }

  const data = parseResponseBody({
    rawBody,
    contentType: response.headers.get("content-type"),
    operation
  })

  const xeroErrorMessage = extractXeroErrorMessage(data)

  assert(
    response.ok,
    `Xero failed to ${operation} ` +
      `(${response.status} ${response.statusText})` +
      (xeroErrorMessage ? `: ${xeroErrorMessage}` : "")
  )

  return {
    status: response.status,
    data
  }
}

function parseResponseBody ({
  rawBody,
  contentType,
  operation
}) {
  if (!rawBody) {
    return {}
  }

  const looksLikeJson =
    String(contentType || "")
      .toLowerCase()
      .includes("json") ||
    /^\s*[\[{]/.test(rawBody)

  if (!looksLikeJson) {
    return {
      raw: rawBody
    }
  }

  try {
    return JSON.parse(rawBody)
  } catch {
    throw new Error(
      `Xero returned invalid JSON while attempting to ${operation}`
    )
  }
}

function extractXeroErrorMessage (data) {
  if (!data || typeof data !== "object") {
    return ""
  }

  const messages = []

  const directMessages = [
    data.error_description,
    data.error,
    data.Message,
    data.message,
    data.Detail,
    data.detail,
    data.Title,
    data.title
  ]

  for (const value of directMessages) {
    if (typeof value === "string" && value.trim()) {
      messages.push(value.trim())
    }
  }

  const elements = Array.isArray(data.Elements)
    ? data.Elements
    : Array.isArray(data.elements)
      ? data.elements
      : []

  for (const element of elements) {
    const validationErrors = Array.isArray(
      element?.ValidationErrors
    )
      ? element.ValidationErrors
      : Array.isArray(element?.validationErrors)
        ? element.validationErrors
        : []

    for (const validationError of validationErrors) {
      const message =
        validationError?.Message ||
        validationError?.message

      if (typeof message === "string" && message.trim()) {
        messages.push(message.trim())
      }
    }
  }

  return [...new Set(messages)].join("; ")
}

function extractPayment (response) {
  if (!response || typeof response !== "object") {
    return null
  }

  if (
    response.Payment &&
    typeof response.Payment === "object"
  ) {
    return response.Payment
  }

  if (
    Array.isArray(response.Payments) &&
    response.Payments.length > 0
  ) {
    return response.Payments[0]
  }

  if (response.PaymentID) {
    return response
  }

  return null
}

function createIdempotencyKey ({
  configClientId,
  paymentId
}) {
  return uuid()
  const digest = crypto
    .createHash("sha256")
    .update(`${configClientId}\0${paymentId}`)
    .digest("hex")

  return digest
}

function assertNonEmptyString (value, name) {
  assert(
    typeof value === "string" &&
      value.trim().length > 0,
    `${name} must be a non-empty string`
  )
}

async function eventHookLogic (config, connectionContainer) {
  const { event, payment, user, application, thing, createEvent, customData } = connectionContainer
  const [configClientId, configClientSecret, configAccountName] = config

  try {
    const r = await postXeroInvoicePayment({
      configClientId,
      configClientSecret,
      configAccountName,
      paymentUserPaymentId: payment.userPaymentId,
      paymentTotal: payment.total,
      paymentCurrency: payment.currency,
      paymentId: payment.id
    })

    createEvent({
      type: 'CONNECTION_GOOD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      thingId: thing ? thing.id : undefined,
      customData: {
        id: 'CONNECTION_XERO',
        theirId: [
          `Invoice number: ${payment.userPaymentId}`,
          `Invoice ID: ${r.invoiceId}`,
          `Account ID: ${r.accountId}`
        ]
          .join('\n\n')
      }
    })
  } catch (e) {
    createEvent({
      type: 'CONNECTION_BAD',
      userId: user.id,
      applicationId: application ? application.id : undefined,
      thingId: thing ? thing.id : undefined,
      customData: { id: 'CONNECTION_XERO', message: e.message }
    })
  }
}

module.exports = new Connection({
  id: 'CONNECTION_XERO',
  type: 'CONNECTION_TYPE_ERP',
  name: 'Xero',
  color: '#1AB4D7',
  logo: cdn => `${cdn}/connections/CONNECTION_XERO.svg`,
  configNames: ['Client ID', 'Client secret', 'Account name'],
  configDefaults: ['', '', ''],
  eventHooks: {
    'SESSION_CART_PAY': eventHookLogic
  },
  instructions: ({ rdic, user, applications }) => {
    const { apiUrl, docsUrl } = rdic.get('environment')
    const applicationUrls = applications
      .filter(_ => _.baseSettingsRender === 'stickypay' && !_.stickyretail.get('isMoto'))
      .map(_ => `${_.name}:\n\n<strong>${apiUrl}/go/flow/${_.id}?total=[AMOUNTDUE]&amp;currency=${user.currency}&amp;userPaymentId=[INVOICENUMBER]</strong>`)
      .join('\n\n')
    const what = applicationUrls.length > 0 ? applicationUrls : 'There are no valid flows set up.'
    return [
      {
        "id": "71d05208-3781-4c24-996e-c4c0d1c6b228",
        "config": {
          "what": what,
          "font": "#211552--center--100%--false",
          "backgroundColour": "#ffffff",
          "icon": ""
        }
      },
      {
        "id": "a21eddf2-aa86-4b6a-a2af-8ac279b246f7",
        "config": {
          "action": `url~~||~~/developer/keys?docsRoute=%2Fxero`,
          "label": "Documentation",
          "colour": "#1AB4D7",
          "foregroundColour": "#ffffff",
          "icon": "arrowRight",
          "fullWidth": false,
          "veryRoundedCorners": true
        }
      }
    ]
  }
})
