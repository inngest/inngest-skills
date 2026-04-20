# Inngest Plugin — Feature Ideas

Running list of features to build into the plugin. Captured as they come up, not triaged yet. Sterling reviews periodically and promotes to Linear tickets when worth building.

**Format:**
- **Idea title**
- Why: what problem does it solve
- Shape: skill / command / agent / MCP tool
- Origin: where the idea came from

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
