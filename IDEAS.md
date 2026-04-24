# Inngest Plugin — Feature Ideas

Running list of features to build into the plugin. Captured as they come up, not triaged yet. Sterling reviews periodically and promotes to Linear tickets when worth building.

**Format:**
- **Idea title**
- Why: what problem does it solve
- Shape: skill / command / agent / MCP tool
- Origin: where the idea came from

---

## Production observability MCP server

**Why:** Customers want proactive insights into their production Inngest environments via an AI coding agent. Today the dev server MCP is the only surface, which covers local development. Prod is a blind spot. Same missing primitives surfaced in the dev server friction log (F8 step output, F9 cascade tracing, F10 list_runs with filters) apply to prod too. Building the MCP forces the REST API shape, which is the v2/v3 dogfooding goal.

**Shape:** MCP server wrapping a production REST API. Read-only in v1. Auth per env. Parallel surface to the dev server MCP so local and prod feel the same to an agent.

**Blocker:** The production REST API doesn't surface this information today. Pure product/eng work before plugin work can start. Track alongside F8/F9/F10 in Linear.

**Open questions:**
- Auth model when a project has multiple envs
- PII surface when agents query failed runs with user data in event payloads
- Read-only vs confirmed-write operations (no "cancel prod run" from an agent without explicit approval)

**Origin:** 2026-04-21 plugin strategy session. Customer request + aligns with v2/v3 API design goal.

---

## Anti-pattern detection: sendEvent + waitForEvent → invoke refactor

**Why:** When a developer writes `step.sendEvent` followed by `step.waitForEvent` where the wait is targeting the effect of the send (same function, matched by correlation ID), they've built a manual RPC when `step.invoke` would do it with less code, better types, and tighter coupling. The pattern is a real code smell in Inngest codebases but it's subtle — by the time you notice it, the anti-pattern is often baked into multiple files.

**Shape:** skill that includes lint guidance, OR a dedicated code-review command (`/inngest:review` or `/inngest:audit`). Could also be an MCP tool that scans for the pattern in a project and reports matches.

**Detection heuristic:**
- Find a `step.sendEvent(id, { name: "X", data: { correlationId, ... } })` call
- Followed (in the same function or nearby) by `step.waitForEvent(id2, { event: "Y", match: "data.correlationId", ... })`
- Where event Y is plausibly the completion signal from a function that was triggered by event X
- Flag with: "This looks like a manual RPC. Consider replacing with `step.invoke` for tighter coupling and typed returns."

**Bonus: auto-refactor.** Offer to rewrite the pattern with the developer's confirmation. Show before/after diff.

**Origin:** Lesson 05 (step.invoke) walkthrough on 2026-04-18. Sterling noted this as content-worthy and plugin-worthy during the content capture session.

**Related:** This could also flag the inverse anti-pattern: `step.invoke` when the caller is on a different team/service boundary and event-driven coupling would be more appropriate. Harder to detect heuristically.

---

<!-- Add new ideas at the top -->
