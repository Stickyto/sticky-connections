PeopleVine verification accepts a member record ID, a printed card number or a
customer ID, and returns the member's card number and first name. All lookup
paths require an active membership and a matching first name, and save the
PeopleVine customer ID in the session.

The lookup parameters are documented in PeopleVine's
[API schema](https://docs.peoplevine.dev/docs/main.json).

For the live integration test, set the following in the environment or the
repository's ignored `.env` file:

```dotenv
PEOPLEVINE_ENDPOINT=https://api.peoplevine.dev
PEOPLEVINE_USERNAME=your-api-user
PEOPLEVINE_PASSWORD=your-password
PEOPLEVINE_COMPANY_ID=your-company-id
```

```sh
npm run test:peoplevine:integration
```

Use credentials for the company containing Daniel. The test calls the
actual connection with `745681`, `149242` and `13396`, each with first name
`Daniel`, and checks that every call returns the same card number, name and
saved customer ID. It prints these results for inspection. Missing credentials
fail the test; they do not skip it. PeopleVine requests use the real `fetch`;
Sticky session persistence uses in-memory storage. No PeopleVine member data is
modified. Node.js 20.19+ or 22.9+ is required for `--env-file-if-exists`.

Verified against the live API for company 39 on 21 October 2026:

| Input | Identifier | Returned result | Saved customer ID |
| --- | --- | --- | --- |
| `745681` | Customer ID | `{ number: "13396", name: "Daniel" }` | `745681` |
| `149242` | Member record ID | `{ number: "13396", name: "Daniel" }` | `745681` |
| `13396` | Card number | `{ number: "13396", name: "Daniel" }` | `745681` |

The integration test asserts these exact values for every input.
