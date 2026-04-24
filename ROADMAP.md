# Inngest Claude Code Plugin — Roadmap

Plugin scope and direction. See [README.md](./README.md) for installation
and the full skill inventory.

---

## Today (v0.1.0)

The first release covers the core surface for TypeScript projects
building durable systems with Inngest:

| Skill | What it covers |
|---|---|
| `inngest-setup` | SDK installation, client config, serve endpoints, dev server |
| `inngest-events` | Event schema, idempotency, fan-out patterns |
| `inngest-durable-functions` | Triggers, memoization, retries, error handling |
| `inngest-steps` | step.run, step.sleep, step.waitForEvent, step.invoke, step.ai |
| `inngest-flow-control` | Concurrency, throttling, rate limits, debounce, batching |
| `inngest-middleware` | Cross-cutting concerns, dependency injection |

The plugin also ships a local dev server MCP config (`.mcp.json`) so
Claude Code can interact with the Inngest dev server directly when
debugging functions.

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

The plugin's MCP surface today is dev-server only. A production-side
MCP server is planned so Claude Code can investigate live runs, debug
production failures, and answer questions about deployed functions.
Will apply across all use cases — greenfield through brownfield,
post-deployment.

### Migration skill convention

Every SDK major version creates a migration skill. v3 → v4 (the next
release) is the first instance and the template for future major
versions.

### Quality measurement

The plugin ships with an eval harness in `eval/` — a 10-prompt catalog
of realistic dev requests scored by an LLM judge against per-prompt
rubrics. The harness measures whether the plugin shifts agent output
toward durable patterns. It serves as a regression net for every
change to skill descriptions or content.

---

## Versioning

Releases are tagged in this repo.

- **v0.1.0** — first standalone release, six skills covering the core
  TypeScript durable-execution surface, dev server MCP config, eval
  harness scaffolding
