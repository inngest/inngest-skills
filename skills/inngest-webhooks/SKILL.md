---
name: inngest-webhooks
description: Create and configure Inngest webhooks for receiving events from third-party services. Covers webhook creation, transform functions for mapping payloads, signature verification, REST API for sending events, event keys, branch environment routing, common integrations (Stripe, Clerk, GitHub, Resend), and local testing with tunnels.
---

# Inngest Webhooks

Receive events from any third-party service via webhooks and the REST API. Inngest provides unique webhook URLs with server-side transform functions that map incoming payloads to the Inngest event format.

> **These skills are focused on TypeScript.** For Python or Go, refer to the [Inngest documentation](https://www.inngest.com/llms.txt) for language-specific guidance. Core concepts apply across all languages.

## Core Concepts

- **Provider** — the service sending webhook events as HTTP POST requests (Stripe, GitHub, Clerk, etc.)
- **Consumer** — the Inngest webhook URL receiving the POST requests
- **Transform** — a JavaScript function that runs on Inngest's servers to map raw payloads to Inngest events (no cost or load on your infrastructure)

## Creating a Webhook

1. Navigate to **Manage > Webhooks** in the Inngest dashboard
2. Click **Create Webhook**
3. Copy the generated URL and provide it to your webhook provider

Webhook URLs use the format: `https://inn.gs/e/<unique-key>`

## Transform Functions

Every webhook needs a transform to map the raw payload to Inngest's event format.

### Function Signature

```javascript
function transform(evt, headers = {}, queryParams = {}, raw = "") {
  return {
    name: "provider/event.type",  // Required: event name
    data: evt,                    // Required: event payload
    id: evt.id,                   // Optional: deduplication ID
    ts: Date.now(),               // Optional: timestamp in ms
  };
}
```

### Parameters

| Parameter | Type | Description |
|---|---|---|
| `evt` | object | Raw JSON payload from the POST body |
| `headers` | object | HTTP headers (canonicalized: `X-Github-Event`, `Stripe-Signature`) |
| `queryParams` | object | Parsed query string parameters (**values are always arrays**) |
| `raw` | string | Raw request body string (for signature verification) |

**Header canonicalization:** First character and characters following a hyphen are uppercase, rest lowercase. Always use this format when accessing headers in transforms.

### Best Practice: Prefix Event Names

Always prefix event names with the provider service name:

```javascript
// ✅ DO: Prefix with provider name
name: `stripe/${evt.type}`      // stripe/charge.succeeded
name: `clerk/${evt.type}`       // clerk/user.created
name: `github.${eventName}`     // github.push

// ❌ DON'T: Use raw event names without prefix
name: evt.type                  // charge.succeeded — ambiguous source
```

## Common Integration Transforms

### Stripe

```javascript
function transform(evt, headers = {}, queryParams = {}) {
  return {
    id: evt.id,                    // Deduplication using Stripe event ID
    name: `stripe/${evt.type}`,
    data: evt,
  };
}
```

### GitHub

```javascript
function transform(evt, headers = {}, queryParams = {}) {
  const name = headers["X-Github-Event"];
  return {
    name: "github." + name.trim().replace("Event", "").toLowerCase(),
    data: evt,
  };
}
```

### Clerk

```javascript
function transform(evt, headers = {}, queryParams = {}) {
  return {
    name: `clerk/${evt.type}`,
    data: evt.data,
  };
}
```

### Linear

```javascript
function transform(evt, headers = {}, queryParams = {}) {
  return {
    name: `linear/${evt.type.toLowerCase()}.${evt.action}`,
    data: evt,
  };
}
```

### Intercom

```javascript
function transform(evt, headers = {}, queryParams = {}) {
  return {
    name: `intercom/${evt.topic}`,
    data: evt.data,
    ts: evt.created_at * 1000,     // Convert seconds to milliseconds
  };
}
```

### Resend

```javascript
function transform(evt, headers = {}, queryParams = {}) {
  return {
    name: `resend/${evt.type}`,
    data: evt.data,
  };
}
```

## Error Handling in Transforms

If a transform throws an error, Inngest returns **400** to the provider (most providers will retry). If you catch the error and return an event, Inngest returns **200** (provider will NOT retry).

```javascript
function transform(evt, headers = {}, queryParams = {}) {
  try {
    return {
      name: `slack/${evt.type}`,
      data: { ts: evt.event.item.ts },
    };
  } catch (err) {
    // ⚠️ Returns 200 — provider won't retry
    return {
      name: "slack/transform.failed",
      data: { error: String(err), payload: evt },
    };
  }
}
```

**Choose your strategy:**
- **Let errors throw** (400 response) — provider retries, you may fix the transform before next attempt
- **Catch and return a failure event** (200 response) — no retries, but you can handle the failure in a function

## Verifying Webhook Signatures

Many providers (Stripe, GitHub, Clerk) sign requests with a secret. Pass the raw body and signature through your transform, then verify in your function.

### Transform (Stripe Example)

```javascript
function transform(evt, headers, queryParams, raw) {
  return {
    name: `stripe/${evt.type}`,
    data: {
      raw,                              // Raw body for verification
      sig: headers["Stripe-Signature"], // Provider's signature header
    },
  };
}
```

### Function Verification

```typescript
import { Inngest, NonRetriableError } from "inngest";

const inngest = new Inngest({ id: "my-app" });

export const handleCharge = inngest.createFunction(
  { id: "stripe-charge-updated" },
  { event: "stripe/charge.updated" },
  async ({ event, step }) => {
    // Verify signature before processing
    if (!verifySig(event.data.raw, event.data.sig, stripeSecret)) {
      throw new NonRetriableError("failed signature verification");
    }

    const data = JSON.parse(event.data.raw);

    await step.run("process-charge", async () => {
      return processCharge(data);
    });
  }
);
```

## REST API for Sending Events

Send events directly via HTTP without the SDK.

### Endpoint

```
POST https://inn.gs/e/<EVENT_KEY>
```

### Single Event

```bash
curl -X POST https://inn.gs/e/$INNGEST_EVENT_KEY \
  -H "Content-Type: application/json" \
  -d '{
    "name": "user/signup.completed",
    "data": {
      "userId": "user_123",
      "email": "user@example.com"
    }
  }'
```

### Multiple Events

```bash
curl -X POST https://inn.gs/e/$INNGEST_EVENT_KEY \
  -H "Content-Type: application/json" \
  -d '[
    { "name": "order/placed", "data": { "orderId": "ord_1" } },
    { "name": "order/placed", "data": { "orderId": "ord_2" } }
  ]'
```

### Response

```json
{
  "ids": ["01H08W4TMBNKMEWFD0TYC532GG"],
  "status": 200
}
```

**Size limit:** 512KB per request (typically 10–1,000 events). Can be increased per account.

### Branch Environment Routing

Add the `x-inngest-env` header or query parameter to route events to a specific branch environment:

```bash
curl -X POST "https://inn.gs/e/$INNGEST_EVENT_KEY" \
  -H "Content-Type: application/json" \
  -H "x-inngest-env: feature/my-branch" \
  -d '{ "name": "test/event", "data": {} }'
```

**The value must be the branch environment name**, not the ID from the dashboard URL. If `x-inngest-env` is omitted, events go to the branch events page and **will NOT trigger any functions**.

## Event Keys

Event keys authenticate event publishing to Inngest.

### Creating a Key

1. In the Inngest dashboard, go to **Manage > Event Keys**
2. Click **Create Event Key**
3. Name it descriptively and copy the generated key

### Configuration

```typescript
import { Inngest } from "inngest";

// Recommended: Set INNGEST_EVENT_KEY environment variable
const inngest = new Inngest({ id: "my-app" });

// Or pass explicitly (not recommended for production)
// const inngest = new Inngest({ id: "my-app", eventKey: "xyz..." });
```

**Security rules:**
- Use unique keys per environment and application
- Store keys as secrets — never expose in client-side code
- For browser event sending, proxy through an API endpoint or edge function
- **Not required locally** — the Dev Server does not validate event keys

## Supported Content Types

| Content Type | Status | Notes |
|---|---|---|
| `application/json` | Stable | Fully supported |
| `application/x-www-form-urlencoded` | Beta | Values parsed as **arrays of strings** |
| `multipart/form-data` | Beta | Values parsed as **arrays of strings** |

### Form Data Example

```bash
curl https://inn.gs/e/<KEY> \
  -H "content-type: application/x-www-form-urlencoded" \
  -d "name=Alice&messages=hello&messages=world"
```

Transform receives parsed JSON where **all values are arrays**:

```json
{
  "messages": ["hello", "world"],
  "name": ["Alice"]
}
```

## Branch Environments

**All branch environments share the same webhooks.** Route to a specific branch using:

- Query parameter: `https://inn.gs/e/<KEY>?x-inngest-env=branch-1`
- Header: `x-inngest-env: branch-1`

**If `x-inngest-env` is not specified**, events go to the branch events page and **will NOT trigger any functions**.

## Webhook REST API

Manage webhooks programmatically via the REST API.

### Update Webhook Transform

```typescript
const response = await fetch(
  `https://api.inngest.com/v1/webhooks/${webhookId}`,
  {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.INNGEST_SIGNING_KEY}`,
    },
    body: JSON.stringify({
      name: "stripe",
      transform: transformFunctionCode,
    }),
  }
);
```

Authentication uses the `INNGEST_SIGNING_KEY` as a Bearer token.

## Testing Webhooks Locally

The Dev Server at `http://localhost:8288` can receive events, but **external webhook providers cannot reach localhost directly**.

### Options

1. **Dashboard forwarding** — use the "Send to Dev Server" button in the Inngest dashboard to forward webhook events to your local machine
2. **Tunnel** — use ngrok or localtunnel to expose your Dev Server:

```bash
# Start Dev Server
npx --ignore-scripts=false inngest-cli@latest dev

# In another terminal, create a tunnel to the Dev Server
ngrok http 8288
```

3. **Manual curl** — send test events directly:

```bash
curl -X POST "http://localhost:8288/e/test" \
  -H "Content-Type: application/json" \
  -d '{ "name": "stripe/charge.succeeded", "data": { "id": "ch_123", "amount": 2500 } }'
```

### Transform Testing

The Inngest dashboard includes a built-in transform testing tool — paste an incoming payload and preview the transformed event. For providers without example payloads, use [TypedWebhook.tools](https://typedwebhook.tools/) to browse webhook payload structures.

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| Webhook returns 400 | Transform function threw an error | Add try/catch or fix the transform logic |
| Events not triggering functions | Missing `x-inngest-env` for branch environments | Add the header or query parameter with the branch **name** |
| Duplicate function runs | No deduplication ID set | Return `id` field in your transform (e.g., `evt.id` for Stripe) |
| Signature verification fails | Wrong header name casing | Use canonicalized header names (e.g., `Stripe-Signature`, not `stripe-signature`) |
| Form data values unexpected | Content type is `x-www-form-urlencoded` | All values are parsed as arrays of strings — access accordingly |
| Provider not retrying failed webhooks | Transform catches error and returns 200 | Let the error throw to return 400, or handle failures in a function |

See [inngest-events](../inngest-events/SKILL.md) for event design patterns and [inngest-durable-functions](../inngest-durable-functions/SKILL.md) for function configuration.
