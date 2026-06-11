---
name: inngest-api
description: "Use when debugging why an Inngest function run failed, reading step-by-step execution traces, finding the runs an event triggered, invoking a function from the terminal or CI, syncing an app in a deploy pipeline, querying execution data with SQL, or scripting against Inngest from outside your app. Covers the `inngest-cli api` commands and the Inngest v2 REST API: API key auth, dev server vs Inngest Cloud targeting, runs, traces, event runs, function invocation, app syncs, environments, webhooks, keys, and Insights queries."
---

# Inngest API (CLI + v2 REST)

Programmatic access to Inngest execution data: function runs, step traces, event-triggered runs, direct invocation, app syncs, and SQL queries over execution history. Everything here works without a browser or dashboard, which makes it the primary surface for coding agents, CI pipelines, and terminal debugging.

Two ways in, same API:

1. **`inngest-cli api`** (preferred) — every v2 endpoint as a subcommand, JSON output, pipeable to `jq`.
2. **Raw HTTP** against the v2 REST API — for scripts and tooling that can't shell out.

> The CLI is the authoritative interface. If anything in this skill disagrees with the CLI, trust `npx inngest-cli@latest api --help` and `npx inngest-cli@latest api <command> --help`.

## Zero-setup check (do this first)

Before asking the user for anything, determine what you already have:

```bash
# 1. Is a local dev server running? (no API key needed locally)
npx inngest-cli@latest api health
# → {"data": {"status": "ok"}} means you can use every command locally, no auth

# 2. Is a Cloud API key available?
[ -n "$INNGEST_API_KEY" ] && echo "cloud access available" || echo "local only"
```

- **Local dev server** (default target): no API key required. All commands work as-is.
- **Inngest Cloud** (`--prod`): requires an API key (`sk-inn-api-...`) in `$INNGEST_API_KEY` or `--api-key`. A signing key (`signkey-prod-...`) also works via `$INNGEST_SIGNING_KEY` / `--signing-key`.

The only step that requires a human: creating an API key. Only org admins can do it, at [app.inngest.com/settings/api-keys](https://app.inngest.com/settings/api-keys) (dashboard → profile menu → API Keys). Keys can be scoped to a single environment. If `--prod` returns 401 and no key is set, ask the user to create one and export it:

```bash
export INNGEST_API_KEY=sk-inn-api-...
```

Everything else in this skill you can do autonomously.

## Targeting

| Flag | Target |
|------|--------|
| (none) | Local dev server (`http://localhost:8288/api/v2`) |
| `--prod` | Inngest Cloud production (`https://api.inngest.com/v2`) |
| `--api-host` / `--api-port` | Custom API server (self-hosted, non-default dev port) |
| `--env <name>` or `$INNGEST_ENV` | Non-production Cloud environment (sent as `X-Inngest-Env` header) |

If the dev server is on a non-default port (it falls back to 8289+ when 8288 is taken), pass `--api-port`.

## Command quick reference

| Command | Endpoint | What it does |
|---------|----------|--------------|
| `get-function-run <run-id>` | `GET /runs/{run_id}` | Run summary: status, timing, trigger, output |
| `get-function-trace <run-id>` | `GET /runs/{run_id}/trace` | Full step-by-step trace tree |
| `get-event-runs <event-id>` | `GET /events/{event_id}/runs` | All runs an event triggered |
| `invoke-function <app-id> <function-id>` | `POST /apps/{app_id}/functions/{function_id}/invoke` | Invoke a function directly |
| `sync-app <app-id> --url <url>` | `POST /apps/{app_id}/syncs` | Sync an app (CI/CD deploys) |
| `get-account` | `GET /account` | Authenticated account info |
| `get-account-envs` | `GET /envs` | List environments |
| `create-env` / `patch-env <id>` | `POST /envs`, `PATCH /envs/{id}` | Create / archive environments |
| `get-webhooks` / `create-webhook` | `GET\|POST /env/webhooks` | Manage inbound webhooks |
| `get-account-event-keys` | `GET /keys/events` | List event keys |
| `get-account-signing-keys` | `GET /keys/signing` | List signing keys |
| `get-insights-tables` | `GET /insights/tables` | Tables queryable via Insights SQL |
| `get-insights-event-schemas` | `GET /insights/events/schemas` | Event payload schemas |
| `query-insights --query <sql>` | `POST /insights/query` | Run SQL over execution data |
| `query-insights-prompt --prompt <text>` | `POST /insights/query/prompt` | Natural language → Insights SQL |
| `health` | `GET /health` | API reachability check |

Flag details for every command: [references/cli-commands.md](references/cli-commands.md). Endpoint request/response schemas: [references/rest-api-v2.md](references/rest-api-v2.md).

## The debugging loop

The core workflow when a run fails. You have a run ID from a log, an alert, or `get-event-runs`:

```bash
# 1. Get the run summary — status, duration, what triggered it
npx inngest-cli@latest api --prod get-function-run 01KTCTWT8XDEGWDMVX3Q9M69ND

# 2. Pull the full trace with step outputs
npx inngest-cli@latest api --prod get-function-trace 01KTCTWT8XDEGWDMVX3Q9M69ND --include-output

# 3. Isolate the failing step
npx inngest-cli@latest api --prod get-function-trace 01KTCTWT8XDEGWDMVX3Q9M69ND --include-output \
  | jq '[.data.rootSpan.children[] | select(.status == "FAILED")]'

# 4. Read the error in the step output, fix the code, then verify locally
npx inngest-cli@latest api invoke-function my-app my-function --data '{"orderId": "test-123"}'

# 5. The invoke response contains a runId — trace it to confirm the fix
npx inngest-cli@latest api get-function-trace <new-run-id> --include-output
```

The trace is real execution data: which steps ran, in what order, what each returned, where it failed and with what error. Work from the trace, not from guessing at the code.

**Run statuses:** `QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`.
**Span statuses:** `RUNNING`, `COMPLETED`, `FAILED`, `WAITING`, `CANCELLED`, `SKIPPED`.
**Step ops:** `RUN`, `SLEEP`, `WAIT_FOR_EVENT`, `INVOKE`, `SEND_EVENT`, `AI_GATEWAY`, `WAIT_FOR_SIGNAL`.

### jq recipes

```bash
# Status + duration of every step
jq '.data.rootSpan.children[] | {name, status, durationMs}'

# Just the error output of failed steps
jq '.data.rootSpan.children[] | select(.status == "FAILED") | {name, output}'

# Find steps stuck WAITING (waitForEvent / sleep that never resolved)
jq '.data.rootSpan.children[] | select(.status == "WAITING") | {name, stepOp, queuedAt}'

# Runs from an event, newest status per function
npx inngest-cli@latest api --prod get-event-runs <event-id> --limit 5 \
  | jq '.data[] | {function: .function.id, status, id}'
```

## Finding IDs without being handed one

You don't need a human to give you a run ID:

- **From an event ID** (logs, `inngest/function.failed` payloads): `get-event-runs <event-id>` lists every run it triggered.
- **From the local dev server**: the dev server MCP (`list_functions`, `send_event`, `get_run_status`) and the dev server UI at `localhost:8288` expose app IDs, function IDs, and recent runs.
- **From Insights SQL** (Cloud): query execution history directly. Start with `get-insights-tables` and `get-insights-event-schemas` to learn the schema, then:

```bash
# Find recent failed runs without leaving the terminal
npx inngest-cli@latest api --prod query-insights-prompt \
  --prompt "function runs that failed in the last 24 hours, with run ID and function name"
# → returns SQL; review it, then execute:
npx inngest-cli@latest api --prod query-insights --query "<generated sql>"
```

Insights uses a modified ClickHouse SQL dialect. The prompt endpoint translates natural language to SQL; always review generated SQL before running it.

- **App ID and function ID** (needed for `invoke-function`): these are the `id` values from your code — the client's `id` and the function's `id` in `createFunction`. Read them from the codebase, or from `get-function-run` output (`.data.app.id`, `.data.function.id`).

## Invoking functions

```bash
npx inngest-cli@latest api invoke-function <app-id> <function-id> \
  --data '{"message": "hello"}' \
  --idempotency-key "test-fix-001"
```

- Returns `201` (completed synchronously, `result` populated) or `202` (enqueued, poll the `runId`).
- `409` means the idempotency key was already used; `422` means the invoke was rate limited, debounced, or skipped by flow control.
- Use idempotency keys when retrying invokes in scripts so you don't double-execute side effects.

## CI/CD patterns

```bash
# Sync an app after deploy (replaces the curl-the-serve-endpoint dance)
npx inngest-cli@latest api --prod sync-app <app-id> --url https://myapp.com/api/inngest

# Gate a pipeline on a run completing
run_status=$(npx inngest-cli@latest api --prod get-function-run "$RUN_ID" | jq -r '.data.status')
```

Use an environment-scoped API key in CI, stored as a secret.

## Raw REST (no CLI)

Base URLs: `https://api.inngest.com/v2` (Cloud), `http://localhost:8288/api/v2` (dev server).

```bash
curl -s https://api.inngest.com/v2/runs/01KTC.../trace?includeOutput=true \
  -H "Authorization: Bearer $INNGEST_API_KEY"
```

- **Auth:** `Authorization: Bearer <key>`. API keys (`sk-inn-api-...`) are v2-only; signing keys (`signkey-prod-...`) work on v1 and v2.
- **Environment targeting:** `X-Inngest-Env: <env-name>` header (required for webhook endpoints).
- **Response envelope:** every response is `{"data": ..., "metadata": {"fetchedAt", "cachedUntil"}}`. List responses add `{"page": {"cursor", "hasMore", "limit"}}`.
- **Pagination:** pass `cursor` from the previous response until `hasMore` is false.
- **Errors:** `{"errors": [{"code", "message"}]}` with conventional status codes (401 auth, 404 not found, 409 idempotency/conflict, 422 flow-control rejection, 429 API rate limit).

Full endpoint-by-endpoint schemas: [references/rest-api-v2.md](references/rest-api-v2.md).

## Live documentation sources

When this skill might be stale, the API self-describes:

- **OpenAPI spec (machine-readable, complete):** https://api-docs.inngest.com/api-specs/v2.json
- **LLM-friendly docs index:** https://api-docs.inngest.com/llms.txt (append `.md` to any api-docs page URL for markdown)
- **CLI help:** `npx inngest-cli@latest api --help` — always matches the installed CLI version
- **Human docs:** https://api-docs.inngest.com/ and https://www.inngest.com/docs/cli

The `api` subcommand is beta; command names and flags may change between CLI versions. When a command errors unexpectedly, re-check `--help` before retrying.
