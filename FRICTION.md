# Inngest Plugin — Friction Log

Live capture of friction discovered while using the Inngest skills + dev server MCP through Claude Code. This log feeds CLI design and API v2/v3 decisions.

**How to use:** Drop entries below as you hit them. Fast and ugly is fine. Sterling triages weekly into Linear tickets.

**Format:**
- **Date** — what you were trying to do
- **What broke / what felt wrong**
- **Workaround (if any)**
- **Suggested fix / product implication**

---

## Entries

### 2026-04-16 — Autonomous plugin tests (2 repos: Express integration + greenfield pipeline)

**F1: SDK v4 createFunction signature mismatch in skills**
- Trying to: Create Inngest functions using plugin skill guidance
- What broke: Skills show 3-argument form `createFunction(config, trigger, handler)` but SDK v4.2.4 requires triggers inside config: `createFunction({ id, triggers: [{ event: "..." }] }, handler)`. Both test agents initially wrote v3-style code. Runtime error: *"Triggers belong in the first argument"*
- Workaround: The runtime error message is actually decent and agents self-corrected
- Fix: **Update all 6 skills in inngest-skills repo to v4 syntax.** This is the #1 friction source. Every new user of the plugin will hit this.
- Severity: HIGH (100% reproduction rate)
- Product implication: The SDK migration path from v3 to v4 needs better tooling. If official docs also show v3, this compounds.

**F2: INNGEST_DEV=1 not mentioned in setup skill**
- Trying to: Start Express app with Inngest serve endpoint
- What broke: GET /api/inngest returns `{"code":"internal_server_error"}`. Server logs say "In cloud mode but no signing key found" but only after startup. No env var guidance in the inngest-setup skill.
- Workaround: Agent figured it out from error message and added `INNGEST_DEV=1` to dev script
- Fix: **`inngest-setup` skill must include `INNGEST_DEV=1` in all local dev examples.** Maybe also in the MCP server README.
- Severity: HIGH (blocks the entire dev loop for new users)

**F3: Dev server doesn't auto-discover local apps**
- Trying to: List functions after starting Express app on port 3001
- What broke: `list_functions` MCP tool still showed functions from a different app. Had to manually POST /fn/register with the app URL. No guidance in skills or MCP docs about how to trigger registration.
- Workaround: Manual sync via POST request. `--no-discovery` flag on dev server was used (our setup), which disables scanning. Without it, dev server scans common ports.
- Fix: **Add registration guidance to inngest-setup skill.** "If using --no-discovery, add -u http://localhost:PORT/api/inngest to the dev command." Also consider: should the SDK auto-register when INNGEST_DEV=1?
- Severity: MEDIUM (confusing but has workarounds)

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
- Fix: **Skills should explicitly say "never hardcode isDev. Use INNGEST_DEV=1 env var."** The current skill text is silent on this.
- Severity: MEDIUM (silent production bug if shipped)

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
