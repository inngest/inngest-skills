---
name: inngest-cli
description: Install and use the Inngest CLI and Dev Server. Covers inngest dev, inngest start, auto-discovery, configuration files, Docker setup, environment variables, testing functions locally, MCP server for AI dev tools, serve() endpoint debugging, and deployment workflow from local to production.
---

# Inngest CLI

Master the Inngest CLI for local development, testing, and self-hosted production. The CLI provides the Dev Server — a fully-featured, open-source local version of the Inngest Platform.

> **These skills are focused on TypeScript.** For Python or Go, refer to the [Inngest documentation](https://www.inngest.com/llms.txt) for language-specific guidance. Core concepts apply across all languages.

## Installation

```bash
# npx (recommended — always latest)
npx --ignore-scripts=false inngest-cli@latest dev

# yarn
yarn dlx inngest-cli@latest dev

# pnpm
pnpm dlx inngest-cli@latest dev

# Global install
npm install -g inngest-cli

# Docker
docker pull inngest/inngest
```

**The `--ignore-scripts=false` flag is required with npx** — the Inngest npm package relies on lifecycle scripts to install the CLI binary. Bun does not support lifecycle scripts by default, so use `npx` even in Bun projects.

## `inngest dev` — Local Dev Server

Starts an in-memory local version of Inngest with a browser UI at `http://localhost:8288`.

```bash
# Auto-discover apps on common ports/endpoints
npx --ignore-scripts=false inngest-cli@latest dev

# Specify your app URL
npx --ignore-scripts=false inngest-cli@latest dev -u http://localhost:3000/api/inngest

# Custom port
npx --ignore-scripts=false inngest-cli@latest dev -p 9999

# Multiple apps
npx --ignore-scripts=false inngest-cli@latest dev \
  -u http://localhost:3000/api/inngest \
  -u http://localhost:4000/api/inngest

# Disable auto-discovery (use with -u)
npx --ignore-scripts=false inngest-cli@latest dev --no-discovery -u http://localhost:3000/api/inngest
```

### CLI Flags

| Flag | Short | Default | Description |
|---|---|---|---|
| `--sdk-url` | `-u` | `http://localhost:3000/api/inngest` | App serve endpoint URL(s) |
| `--port` | `-p` | `8288` | Dev Server port |
| `--host` | | `http://localhost` | Dev Server host |
| `--no-discovery` | | `false` | Disable auto-discovery of apps |
| `--no-poll` | | `false` | Disable polling apps for changes |
| `--config` | | | Path to configuration file |

### Auto-Discovery

Without `--no-discovery`, the Dev Server scans common ports and endpoints automatically:

**Ports scanned:** 80, 443, 3000–3010, 5000, 5173, 8000, 8080, 8081, 8787, 8888, 8910–8915

**Endpoints scanned:**
- `/api/inngest`
- `/x/inngest`
- `/.netlify/functions/inngest`
- `/.redwood/functions/inngest`

## Configuration File

Create an `inngest.json` (or `.yaml`, `.toml`) in your project root. The CLI walks up directories to find it.

```json
{
  "sdk-url": [
    "http://localhost:3000/api/inngest",
    "http://localhost:3030/api/inngest"
  ],
  "no-discovery": true
}
```

```yaml
# inngest.yaml
sdk-url:
  - "http://localhost:3000/api/inngest"
  - "http://localhost:3030/api/inngest"
no-discovery: true
```

## Environment Variables

| Variable | Description |
|---|---|
| `INNGEST_DEV` | `=1` enables Dev Mode (disables signature verification). `=0` forces Cloud mode. Accepts a URL (e.g., `http://localhost:8288`). **Defaults to Cloud mode if unset.** |
| `INNGEST_BASE_URL` | Host for SDK-to-Inngest communication (e.g., `http://localhost:8288`). Leave unset in most cases. |
| `INNGEST_EVENT_KEY` | Authentication key for sending events. **Use any dummy value locally** — Dev Server does not validate. |
| `INNGEST_SIGNING_KEY` | Secures requests between Inngest and your app. **Required in production.** Determines which Inngest environment receives syncs. |
| `INNGEST_SIGNING_KEY_FALLBACK` | Fallback key for signing key rotation (v3.18.0+). |
| `INNGEST_SERVE_ORIGIN` | Full origin URL for Inngest to reach your app (e.g., `https://my-app.com`). Auto-inferred from request headers; **set explicitly for AWS Lambda, proxies, or tunnels.** |
| `INNGEST_SERVE_PATH` | URL path to your serve endpoint (e.g., `/api/inngest`). Auto-inferred in most cases. |
| `INNGEST_STREAMING` | Enable response streaming (`true`/`false`). Extends timeout limits on Vercel and edge runtimes. |
| `INNGEST_ENV` | Target Inngest Environment. Auto-detected on some platforms. |

## Debugging Your Serve Endpoint

Verify your `serve()` endpoint is configured correctly:

```bash
curl -s http://localhost:3000/api/inngest | jq
```

```json
{
  "message": "Inngest endpoint configured correctly.",
  "hasEventKey": false,
  "hasSigningKey": false,
  "functionsFound": 3
}
```

If `functionsFound` is `0`, check that your functions are passed to the `serve()` call.

## Testing Functions Locally

### Send Events via SDK

```typescript
import { Inngest } from "inngest";

const inngest = new Inngest({ id: "my-app" });

await inngest.send({
  name: "user/signup.completed",
  data: {
    userId: "user_123",
    email: "user@example.com",
  },
});
```

### Send Events via curl

```bash
curl -X POST "http://localhost:8288/e/test" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "user/signup.completed",
    "data": {
      "userId": "user_123",
      "email": "user@example.com"
    }
  }'
```

The event key in the URL path (`test` above) can be any value locally.

### Unit Testing with `@inngest/test`

Requires `inngest@>=4.0.0`.

```bash
npm install -D @inngest/test
```

```typescript
import { InngestTestEngine } from "@inngest/test";
import { helloWorld } from "./functions";

// Execute full function
const t = new InngestTestEngine({ function: helloWorld });
const { result } = await t.execute();
expect(result).toEqual("Hello World!");

// Test a single step
const { result: stepResult } = await t.executeStep("calculate-price");
expect(stepResult).toEqual(123);

// Assert step state
const { state } = await t.execute();
expect(state["my-step"]).resolves.toEqual("output");
expect(state["risky-step"]).rejects.toThrowError("failed");

// Mock events
const { result: eventResult } = await t.execute({
  events: [{ name: "demo/event.sent", data: { message: "Hi!" } }],
});

// Mock step responses
const { result: mockResult } = await t.execute({
  steps: [{ id: "external-api-call", handler() { return { status: "ok" }; } }],
});

// Mock sleep/waitForEvent (pause-inducing steps require mocking)
await t.execute({
  steps: [{ id: "wait-one-day", handler() {} }],
});
```

**Mock external dependencies** with your test framework's standard mocking (`jest.mock`, `vi.mock`, etc.) — `@inngest/test` handles only Inngest-specific mocking.

## Docker Setup

### Standalone

```bash
docker run -p 8288:8288 -p 8289:8289 \
  inngest/inngest \
  inngest dev -u http://host.docker.internal:3000/api/inngest
```

Use `host.docker.internal` to reach your app running on the host machine.

### Docker Compose

```yaml
services:
  app:
    build: ./app
    environment:
      - INNGEST_DEV=1
      - INNGEST_BASE_URL=http://inngest:8288
    ports:
      - "3000:3000"
  inngest:
    image: inngest/inngest
    command: "inngest dev -u http://app:3000/api/inngest"
    ports:
      - "8288:8288"
      - "8289:8289"
```

**Port 8288** is the main server and UI. **Port 8289** is the `connect()` WebSocket gateway.

**Critical:** Set `INNGEST_DEV=1` on your app — the TypeScript SDK defaults to Cloud mode, which will skip the Dev Server.

## MCP Server (AI Dev Tools)

The Dev Server exposes an MCP server at `http://127.0.0.1:8288/mcp` (HTTP transport).

```bash
# Claude Code
claude mcp add --transport http inngest-dev http://127.0.0.1:8288/mcp
```

```json
// .cursor/mcp.json (Cursor)
{
  "mcpServers": {
    "inngest-dev": {
      "url": "http://127.0.0.1:8288/mcp"
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|---|---|
| `send_event` | Send events to trigger functions |
| `list_functions` | List all registered functions and triggers |
| `invoke_function` | Execute a function synchronously (default 30s timeout) |
| `get_run_status` | Get detailed status of a function run |
| `poll_run_status` | Poll multiple runs until completion |
| `grep_docs` | Search Inngest documentation by regex pattern |
| `read_doc` | Read a specific documentation page |
| `list_docs` | List available documentation structure |

## `inngest start` — Self-Hosted Production

Runs Inngest as a self-hosted production server. **Not the same as `inngest dev`** — this is for production workloads.

```bash
inngest start --event-key <key> --signing-key <key>
```

| Flag | Default | Description |
|---|---|---|
| `--port` | `8288` | Server port |
| `--signing-key` | | Hex key for request signing |
| `--event-key` | | Authentication key for apps |
| `--redis-uri` | | External Redis connection |
| `--postgres-uri` | | External PostgreSQL connection |
| `--poll-interval` | | App sync polling interval (seconds) |
| `--queue-workers` | `100` | Number of executor workers |
| `--connect-gateway-port` | `8289` | Connect gateway port |

**Environment variable convention:** Convert flags to uppercase with underscores, prefix with `INNGEST_` (e.g., `--signing-key` becomes `INNGEST_SIGNING_KEY`).

Default persistence: in-memory Redis + SQLite at `./.inngest/main.db`. For production, use external Redis and PostgreSQL.

## Deployment Workflow

### Local Development → Production

1. **Develop locally** with `inngest dev` — no keys needed, no code changes for production
2. **Deploy your app** to your hosting platform
3. **Sync with Inngest** using one of three methods:

```bash
# Option 1: Curl from CI/CD
curl -X PUT https://your-app.com/api/inngest --fail-with-body

# Option 2: Vercel/Netlify integrations (automatic on deploy)

# Option 3: Manual sync via Inngest Cloud dashboard
```

4. **Set environment variables** in production:

```bash
INNGEST_EVENT_KEY=<your-event-key>
INNGEST_SIGNING_KEY=<your-signing-key>
```

**No code changes** are needed when moving from local dev to production. The SDK automatically detects the environment.

## Platform-Specific Gotchas

| Platform | Gotcha |
|---|---|
| **Express** | Requires `express.json()` middleware; increase `limit` for large payloads |
| **AWS Lambda** | Set `INNGEST_SERVE_ORIGIN` and `INNGEST_SERVE_PATH` explicitly — auto-inference fails |
| **Firebase Cloud Functions** | Must set `INNGEST_SERVE_PATH` env var |
| **DigitalOcean Functions** | Both `serveOrigin` and `servePath` required in `serve()` config |
| **Cloudflare Workers (Wrangler `--remote`)** | Requires tunnel (ngrok/localtunnel) for Dev Server connection |
| **Google Cloud Run (1st gen)** | Not officially supported; may cause signature verification errors |
| **Docker** | Must set `INNGEST_DEV=1` — SDK defaults to Cloud mode |
| **External webhooks (Stripe, Clerk)** | Require tunnel solution (ngrok, localtunnel) for local testing |

## Quick Reference

```bash
# Start dev server with auto-discovery
npx --ignore-scripts=false inngest-cli@latest dev

# Start with explicit app URL
npx --ignore-scripts=false inngest-cli@latest dev -u http://localhost:3000/api/inngest

# Check serve endpoint health
curl -s http://localhost:3000/api/inngest | jq

# Send test event via curl
curl -X POST http://localhost:8288/e/test -d '{"name": "test/event", "data": {}}'

# Sync after deploy (CI/CD)
curl -X PUT https://your-app.com/api/inngest --fail-with-body

# Self-hosted production
inngest start --event-key <key> --signing-key <key>
```

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| Dev Server doesn't find functions | App not running or wrong port | Start your app first; use `-u` to specify the correct URL |
| `functionsFound: 0` in debug output | Functions not passed to `serve()` | Verify all functions are in the array passed to `serve()` |
| SDK connects to Cloud instead of Dev Server | `INNGEST_DEV` not set | Set `INNGEST_DEV=1` in your environment |
| Functions sync to wrong Inngest environment | Wrong signing key | Check `INNGEST_SIGNING_KEY` matches target environment |
| Duplicate app in Inngest dashboard | App `id` was changed | Keep the `id` in `new Inngest({ id })` stable across deploys |
| Webhook events not reaching Dev Server | No tunnel configured | Use ngrok or localtunnel for external webhook sources |
| "Unattached sync" in dashboard | Auto-sync failed silently | Check integration logs; resync manually |

See [inngest-setup](../inngest-setup/SKILL.md) for SDK installation and [inngest-durable-functions](../inngest-durable-functions/SKILL.md) for function configuration.
