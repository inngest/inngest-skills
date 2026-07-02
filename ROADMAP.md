# Inngest Agent Skills — Roadmap

Shared skill scope and direction for Claude Code, Codex, and other agent
runtimes. See [README.md](./README.md) for installation and the full skill
inventory.

---

## Today (v0.3.0)

The current shared skills cover the core surface for TypeScript projects
building durable systems, durable AI agents, Agent Evals, and brownfield
Inngest migrations:

| Skill | What it covers |
|---|---|
| `inngest-setup` | SDK installation, client config, serve endpoints, dev server |
| `inngest-events` | Event schema, idempotency, fan-out patterns |
| `inngest-durable-functions` | Triggers, memoization, retries, error handling |
| `inngest-steps` | step.run, step.sleep, step.waitForEvent, step.invoke, step.ai |
| `inngest-flow-control` | Concurrency, throttling, rate limits, debounce, batching |
| `inngest-middleware` | Cross-cutting concerns, dependency injection |
| `inngest-realtime` | v4 native realtime, channels, subscription tokens, React/SSE consumers |
| `inngest-cli` | General CLI and dev server workflows: install/run `inngest dev`, local testing, Docker, MCP setup, deployment checks, and self-hosted `inngest start` |
| `inngest-api-cli` | Prescriptive terminal workflows for `inngest api`, Cloud debugging, run traces, event runs, app syncs, invocation, webhooks, envs, keys, and Insights |
| `inngest-api` | REST API v2 and OpenAPI fallback when raw HTTP is needed or the CLI does not expose an endpoint |
| `inngest-agents` | AgentKit, `step.ai`, tool calls, human review, realtime progress, provider flow control |
| `inngest-agent-evals` | Scoring, deferred scorers, sessions, traces, step experiments, Insights, outcome-based eval loops |
| `inngest-brownfield-audit` | Repository analysis, durability-gap discovery, incremental integration planning |
| `inngest-v3-v4-migration` | TypeScript SDK v3 to v4 migration, mixed API cleanup, realtime migration |

Plugin bundles can also ship local dev server MCP config (`.mcp.json`) so
Claude Code, Codex, or other MCP-capable agents can interact with the Inngest
dev server directly when debugging functions.

**Skill descriptions are written as problem-shape triggers** — they fire
on phrases like "webhook handler that drops events," "flaky cron job,"
"24-hour cart abandonment," or "external API rate limits," not just on
the word "Inngest." The intent is for an agent to reach for the right
skill when the developer describes a durability-shaped problem,
regardless of whether they know Inngest is the answer.

---

## What's coming

Three use cases planned, sequenced by effort-vs-impact.

### v3 → v4 upgrade assistance (next)

For existing Inngest users still on SDK v3.

- Version detection (read `package.json`)
- Per-API migration map: 3-arg `createFunction` → options-first, trigger
  syntax changes, middleware rewrite, step API changes
- Scanner for v3 patterns in existing code
- Automated refactor where AST changes are mechanical
- Test runner integration to verify no regressions post-migration
- Manual-review flags for patterns without clean v4 equivalents

Smallest scope, clearest mapping, highest leverage for existing users.
This release establishes the migration-skill pattern that future SDK
major versions will reuse.

### Brownfield audit

For existing teams with legacy code that has durability gaps.

- `/inngest:audit` command
- Durability-auditor agent that finds anti-patterns: `setTimeout` for
  scheduled work, polling loops, manual retry loops, fire-and-forget
  detached Promises, BullMQ/Bee-Queue usage, `node-cron`, long-running
  HTTP handlers, webhooks that don't ack fast
- Prioritized report: severity + suggested Inngest refactor per hotspot
- Optional per-hotspot "apply refactor with tests" flow
- Agent orchestration designed for large repos so context limits don't
  cap usefulness

The biggest enablement surface for new Inngest adopters: run this on
your codebase, see your durability hotspots, fix them with one command.

### Competitor migration

For teams currently on Temporal or Trigger.dev evaluating Inngest.

- `/inngest:migrate-from-temporal` and sibling commands
- Primitive mapping tables (Temporal Activity → `step.run`, Signal →
  event, Timer → `step.sleep`, Workflow → Inngest function)
- Agent that reads competitor code and emits Inngest equivalent
- Test harness to verify behavioral equivalence
- Gotchas doc: model mismatches, redesign points, what doesn't translate

The hardest of the three. Migrations are rarely 1:1 — Temporal's
workflow-as-code model versus Inngest's function-as-handler model is a
real mismatch. Will start with Temporal only and expand based on real
case studies.

---

## Cross-cutting

### Production observability

The plugin MCP surface today is dev-server only. A production-side MCP server
is planned so Claude Code, Codex, and other MCP-capable agents can investigate
live runs, debug production failures, and answer questions about deployed
functions.
Will apply across all use cases — greenfield through brownfield,
post-deployment.

### Migration skill convention

Every SDK major version creates a migration skill. v3 → v4 (the next
release) is the first instance and the template for future major
versions.

### Quality measurement

The plugin repos ship with eval harnesses — prompt catalogs
of realistic dev requests scored by an LLM judge against per-prompt
rubrics. The harness measures whether the plugin shifts agent output
toward durable patterns. It serves as a regression net for every
change to skill descriptions or content.

---

## Versioning

Releases are tagged in this repo.

- **v0.1.0** — first standalone release, seven skills covering the core
  TypeScript durable-execution surface, dev server MCP config, eval
  harness scaffolding
- **v0.2.0** — adds `inngest-cli` for general CLI/dev-server workflows,
  `inngest-api-cli` for prescriptive `inngest api` operations, and narrows
  `inngest-api` to REST API v2/OpenAPI fallback.
- **v0.3.0** — adds `inngest-agent-evals` for Agent Evals with scoring,
  deferred scorers, sessions, traces, step experiments, Insights, and
  outcome-based evaluation loops.
