# Inngest Plugin — Friction Log

Live capture of friction discovered while using the Inngest skills + dev server MCP through Claude Code. This log feeds CLI design and API v2/v3 decisions.

**How to use:** Drop entries below as you hit them. Fast and ugly is fine. Sterling triages weekly into Linear tickets.

**Related:**
- [ROADMAP.md](./ROADMAP.md) — plugin scope and direction (friction items become work here)
- [IDEAS.md](./IDEAS.md) — feature ideas backlog
- Linear: [DEV-315](https://linear.app/inngest/issue/DEV-315/inngest-claude-code-plugin-roadmap-and-v1-scope)

**Format:**
- **Date** — what you were trying to do
- **What broke / what felt wrong**
- **Workaround (if any)**
- **Suggested fix / product implication**

---

## Product/Eng Items (needs Linear tickets)

These are NOT plugin issues. They're friction in the Inngest dev server MCP or the platform itself, discovered via plugin testing. Sterling to triage into Linear.

| # | Severity | Issue | Owner |
|---|----------|-------|-------|
| F8 | **CRITICAL** | `get_run_status` returns `steps: null` — no step output or return values. MCP tools verify execution but not correctness. | Dev server MCP |
| F9 | HIGH | Cascade runs from `step.sendEvent` invisible to MCP tools. No way to trace downstream runs. | Dev server MCP |
| F10 | HIGH | No `list_runs` tool with filters (function, event, status, time). Can only look up by run ID. | Dev server MCP |
| F4 | LOW | `list_functions` has no app filtering. Noise from all registered apps. | Dev server MCP |
| F11 | LOW | `poll_run_status` redundant with `get_run_status` when steps are null. Tied to F8. | Dev server MCP |
| F1 | HIGH | Inngest docs site (served via `grep_docs` MCP tool) still shows v3 `createFunction` patterns. | Docs team |

---

## Plugin Items (resolved or in progress)

| # | Status | Issue |
|---|--------|-------|
| F2 | RESOLVED | INNGEST_DEV=1 now has prominent callout section in setup skill |
| F3 | RESOLVED | Dev server registration troubleshooting added to setup skill |
| F5 | RESOLVED | isDev: true hardcoding warned against explicitly |
| F6 | LOW/OPEN | Unused NonRetriableError import in generated code (cosmetic) |
| F7 | N/A | CLI background execution log capture (not a plugin issue) |

---

## Entries

### 2026-04-16 — MCP tool verification (content moderation pipeline, 3 test events)

**F8: get_run_status returns `steps: null` — no step output or return values**
- Trying to: Verify content moderation decisions (approved vs flagged) via MCP
- What broke: Both `get_run_status` and `poll_run_status` return `"steps": null`. Functions complete but you can't see WHAT they decided. The most natural question ("was this flagged or approved?") is unanswerable from the MCP tools.
- Workaround: None via MCP. Must check app logs manually.
- Fix: **get_run_status should include step outputs and function return values.** This is the biggest MCP gap. Without it, the tools verify execution but not correctness.
- Severity: **CRITICAL** (renders MCP debugging useless for anything beyond "did it run?")
- Product implication: This directly blocks the "AI-assisted debugging" use case. A coding agent can't help debug a function if it can't see what the function returned.

**F9: Cascade runs from step.sendEvent are invisible**
- Trying to: Trace the full moderation pipeline (moderate-content emits content/moderated, triggers notify-moderation-result)
- What broke: `send_event` MCP tool only returns run IDs for directly-triggered functions. Downstream runs from `step.sendEvent` inside a function are untraceable. No tool to find runs by event name or function slug.
- Workaround: None via MCP
- Fix: **Add a list_runs tool with filters** (by function ID, event name, time range, status). Or have send_event/get_run_status include downstream run IDs.
- Severity: HIGH (multi-function workflows are untestable)
- Product implication: Critical for the CLI. Any `inngest runs list --function=X` command needs this server-side.

**F10: No way to query runs by function or event name**
- Trying to: Find notify-moderation-result runs after pipeline completed
- What broke: Can only look up runs by ID. No search/filter capability.
- Workaround: None
- Fix: **Add list_runs MCP tool** with function/event/status/time filters
- Severity: HIGH (same as F9, fundamental missing tool)

**F11: poll_run_status is redundant with get_run_status when steps are null**
- Trying to: Watch pipeline execution in real-time
- What broke: Nothing breaks, but `poll_run_status` returns the same empty shape as `get_run_status` — no step progress, no intermediate output. Polling adds no value over a single get when both omit step data.
- Workaround: N/A
- Fix: Tied to F8. Once step output is included, polling becomes genuinely useful (showing step-by-step progress).
- Severity: LOW (redundancy, not breakage)

---

### 2026-04-16 — Autonomous plugin tests (2 repos: Express integration + greenfield pipeline)

**F1: SDK v4 createFunction signature from docs (not plugin skills)**
- Trying to: Create Inngest functions using plugin skill guidance
- What broke: Agent found v3 3-argument `createFunction(config, trigger, handler)` patterns via `grep_docs` MCP tool (which searches inngest.com docs), not from the plugin skills. Plugin skills already use correct v4 syntax. Runtime error: *"Triggers belong in the first argument"*
- Workaround: The runtime error message is decent and agents self-corrected
- Fix: **Docs site** needs v3 patterns updated. Plugin skills are already v4-correct.
- Status: **RESOLVED for plugin.** Docs site issue remains (product/eng).
- Severity: HIGH on docs side. Plugin is fine.
- Product implication: The SDK migration path from v3 to v4 needs better tooling. `grep_docs` MCP tool serves docs that still show v3 patterns.

**F2: INNGEST_DEV=1 not prominent enough in setup skill**
- Trying to: Start Express app with Inngest serve endpoint
- What broke: GET /api/inngest returns `{"code":"internal_server_error"}`. Server logs say "In cloud mode but no signing key found" but only after startup. The setup skill mentioned INNGEST_DEV but it was buried in config options.
- Workaround: Agent figured it out from error message and added `INNGEST_DEV=1` to dev script
- Fix: Added prominent "CRITICAL: Enable Dev Mode" section before serve endpoints, with symptoms checklist.
- Status: **RESOLVED in plugin.** Commit pending.
- Severity: HIGH (was blocking, now fixed)

**F3: Dev server doesn't auto-discover local apps**
- Trying to: List functions after starting Express app on port 3001
- What broke: `list_functions` MCP tool still showed functions from a different app. Had to manually POST /fn/register with the app URL. No guidance in skills about how to trigger registration.
- Workaround: Manual sync via POST request. `--no-discovery` flag on dev server was used (our setup), which disables scanning.
- Fix: Added troubleshooting guidance to setup skill: `--no-discovery` requires `-u`, registration flow explanation, restart sequence.
- Status: **RESOLVED in plugin.** Commit pending. Remaining question for product: should the SDK auto-register when INNGEST_DEV=1?
- Severity: MEDIUM (was confusing, now documented)

**F4: list_functions MCP tool scoping confusion**
- Trying to: Verify newly registered functions appear
- What broke: After successful sync, `list_functions` returned functions from ALL registered apps (32 from test-app + the new one). No way to filter by app. Agent couldn't tell if registration worked because its functions were buried in the list.
- Workaround: Sent event directly and it worked, proving registration was fine
- Fix: **Add app filtering to list_functions MCP tool** (e.g., `appId` parameter). Or at minimum, group output by app.
- Severity: LOW (cosmetic confusion, doesn't block work)
- Product implication: This matters more as the CLI/MCP tools mature. Developers working on one app shouldn't see noise from others.

**F5: Greenfield test used isDev: true hardcoded in client**
- Trying to: Initialize Inngest client in new project
- What broke: Nothing broke, but agent wrote `new Inngest({ id: "content-moderation", isDev: true })` instead of using INNGEST_DEV env var. This works locally but would fail in production.
- Workaround: N/A (not caught by agent)
- Fix: Added explicit warning: "Never hardcode isDev: true in source code — it will silently break in production. Always use the env var."
- Status: **RESOLVED in plugin.** Commit pending.
- Severity: MEDIUM (was silent production bug risk, now warned)

**F6: Unused NonRetriableError import in generated code**
- Trying to: Generate Inngest function with error handling
- What broke: Agent imported `NonRetriableError` from inngest but never used it. Dead import.
- Workaround: N/A (lint issue only)
- Fix: **Skills should show NonRetriableError usage in context, not just import.** If the skill mentions it, it should show when to throw it.
- Severity: LOW (cosmetic)

**F7: Log capture failed for autonomous claude -p sessions**
- Trying to: Run `claude -p "prompt" > log.txt` in background
- What broke: Background bash processes with heredoc-substituted prompts produced empty log files. Exit code 144 (signal kill) on one test. The agents still executed (created files, installed packages) but stdout wasn't captured.
- Workaround: Write prompt to file first, pipe via stdin
- Fix: **Not a plugin issue** — this is a Claude Code CLI behavior with background execution. But worth noting for anyone building automated test harnesses.
- Severity: LOW (test infrastructure, not plugin)

<!-- Add new entries at the top -->
