# Inngest Claude Code Plugin — Roadmap

Plugin scope, current state, and where it's going. This is the source of
truth for plugin direction. Notion mirror keeps it visible to the team.

**Notion:** _(pending — will link once page exists)_
**Linear:** [DEV-315](https://linear.app/inngest/issue/DEV-315/inngest-claude-code-plugin-roadmap-and-v1-scope)
**Friction log:** [FRICTION.md](./FRICTION.md)
**Ideas backlog:** [IDEAS.md](./IDEAS.md)

---

## Current state (2026-04-24)

**Phase:** Internal dogfood. Not yet positioned as a public/community
product. Plugin's strategic purpose is friction discovery in the Inngest
API surface — input to CLI design and API v2/v3 decisions.

**Shipped:**
- 6 TypeScript-focused skills covering the durable-execution surface:
  `inngest-setup`, `inngest-events`, `inngest-durable-functions`,
  `inngest-steps`, `inngest-flow-control`, `inngest-middleware`
- Local dev server MCP config (`.mcp.json` → `127.0.0.1:8288/mcp`)
- Plugin marketplace manifest installable via
  `/plugin marketplace add inngest/inngest-skills`
- Eval harness scaffolding (`eval/`) — 10-prompt YAML catalog,
  runner stubs, judge stubs

**Validated through smoke tests:**
- Plugin installs cleanly via local marketplace path
- Skill descriptions are present in agent system prompt when installed
- Agent can self-report plugin influence when challenged
- v4 syntax is correct in skills (v3 patterns surfaced via docs friction
  F1 — that's a docs site issue, not a plugin issue)

**Open questions:**
- Does the plugin shift output quality vs Opus 4.7 baseline? Eval harness
  in progress to answer this.
- Are skill descriptions proactive enough to fire on problems that don't
  mention Inngest? Smoke tests so far inconclusive — context bias makes
  attribution hard.

---

## The four use cases

The plugin's actual product surface is bigger than greenfield reference.
Four distinct workflows, each with its own scope and audience.

### Use case 1 — Greenfield startup (current capability)

**Audience:** small teams or individuals starting fresh, building with
Inngest from day one.

**Plugin contribution:** ambient guidance via skill descriptions in
system prompt, alignment with current v4 patterns, MCP debugging surface
against the local dev server.

**Status:** ~70% there. Skills exist, install works. Proactiveness of
skill triggers under evaluation.

**Demo target:** swag store livestream, Wed 2026-04-29.

### Use case 2 — Brownfield audit ("we have 400 services, make them durable")

**Audience:** existing teams with legacy code that has durability gaps.

**What it needs:**
- Scanning command (e.g., `/inngest:audit`)
- Durability-auditor agent that finds anti-patterns: `setTimeout` for
  scheduled work, polling loops, manual retry loops, fire-and-forget
  detached Promises, BullMQ/Bee-Queue usage, `node-cron`, long-running
  HTTP handlers, webhooks that don't ack fast
- Prioritized report: severity + suggested Inngest refactor per hotspot
- Optional per-hotspot "apply refactor with tests" flow
- Agent orchestration for large repos (Explore agent for broad scan,
  pattern-match first, deep-dive only on matches) — Claude Code context
  limits make naive whole-repo reads impractical

**Status:** zero. Skills are reference, not scanners.

**Strategic value:** highest enablement surface for new Inngest adopters.
Consultative sales motion.

### Use case 3 — Competitor migration (Temporal → Inngest, Trigger.dev → Inngest)

**Audience:** teams currently on a competing durable-execution platform,
considering Inngest.

**What it needs:**
- `/inngest:migrate-from-temporal` and sibling commands
- Primitive mapping tables (Temporal Activity → `step.run`, Signal →
  event, Timer → `step.sleep`, Workflow → Inngest function)
- Agent that reads competitor code and emits Inngest equivalent
- Test harness to verify equivalence (run both implementations in
  parallel where possible)
- Gotchas doc: model mismatches, redesign points, what doesn't translate

**Status:** zero. No migration skills exist.

**Strategic value:** competitive displacement. Enterprise pitch:
"we'll migrate you."

**Hard parts:** Temporal's workflow-as-code vs Inngest's
function-as-handler is a real model mismatch. Migrations rarely 1:1.
Need real case studies to validate the mapping.

### Use case 4 — v3 → v4 upgrade assistance

**Audience:** existing Inngest users still on SDK v3 who need to migrate.

**What it needs:**
- Version detection (read `package.json`)
- Per-API migration map: 3-arg `createFunction` → options-first, trigger
  syntax, middleware rewrite, step API changes
- Scanner for v3 patterns
- Automated refactor (AST-aware where feasible)
- Test runner integration to verify no regressions post-migration
- Manual-review flags for patterns that don't have clean v4 equivalents

**Status:** zero migration skills. The convention is captured (every
SDK major version needs a migration skill — see
`project_inngest_plugin_migration_convention.md` memory) but the
implementation isn't built.

**Strategic value:** highest-leverage, lowest-effort of the four. Input
(v3) and output (v4) are both known domains. Existing users want this.

---

## Sequencing

By effort-vs-impact, post-livestream order:

1. **Use case 4 (v3 → v4 migration)** — smallest scope, clearest mapping,
   existing users need it. Builds the migration-skill pattern that
   future SDK majors reuse.
2. **Use case 2 (brownfield audit)** — bigger scope, biggest enablement
   surface. Needs the auditor agent + pattern library.
3. **Use case 3 (competitor migration)** — start with Temporal only,
   expand later. Most strategic but hardest. Needs real migration case
   studies first.

Use case 1 (greenfield) is the foundation everything else builds on. It
stays in flight continuously: tighten skill triggers, add v4 features
as the SDK evolves, keep the eval harness running as a regression net.

---

## Cross-cutting concerns

### Eval harness

The eval harness in `eval/` is the regression net for every change. It
runs each plugin update against the 10-prompt catalog, plugin-on vs
plugin-off, with an LLM judge scoring outputs. If a change degrades
plugin-on output, the harness catches it before livestream embarrassment.

This is itself a small Inngest app (the dogfood plugin dogfooding
itself). Fits.

### Production observability MCP

Customer ask: proactive insights from production environments. Currently
the plugin's MCP surface is dev-server only. Production needs its own
MCP server wrapping a (not-yet-built) prod REST API. Captured in
[IDEAS.md](./IDEAS.md). Blocked on the prod REST API existing.

This is parallel to all four use cases — applies to greenfield and
brownfield both, post-deployment.

### Docs freshness

Skills can drift from current SDK behavior. Today's mitigation: manual
review on SDK releases. Long-term: scheduled LLM diff between docs and
skills, run as an Inngest function. Captured in conversation; not yet
formalized.

### Migration skill convention

Every SDK major version creates a migration skill. v3 → v4 (use case 4)
is the first instance. Captured in
`project_inngest_plugin_migration_convention.md`.

---

## Tracking

- **GitHub:** this repo, branch `sterling/dogfood`. Roadmap lives in
  `ROADMAP.md`.
- **Linear:** [DEV-315](https://linear.app/inngest/issue/DEV-315/inngest-claude-code-plugin-roadmap-and-v1-scope) — tracking ticket
- **Notion:** _(pending)_
- **Friction log:** [FRICTION.md](./FRICTION.md) feeds new ideas + bug fixes
- **Ideas backlog:** [IDEAS.md](./IDEAS.md) holds unscoped feature ideas

When use cases ship, link the work back here. When this roadmap
changes, update Notion and the Linear epic.
