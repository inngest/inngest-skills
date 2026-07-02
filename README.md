<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/inngest-wordmark-light.png">
    <img src="assets/inngest-wordmark.png" alt="Inngest" width="280">
  </picture>
</p>

# Inngest Agent Skills

Agent Skills for building with [Inngest](https://www.inngest.com)'s durable execution platform. These skills give AI coding agents comprehensive guidance on creating reliable, fault-tolerant applications: durable functions, events, steps, flow control, middleware, realtime, AI agents, Agent Evals, CLI operations, REST API fallback, brownfield audits, and SDK migrations.

> **Looking for the full agent-plugin experience?** Use the [Inngest plugin for Claude Code](https://github.com/inngest/inngest-claude-code-plugin) or the [Inngest plugin for Codex](https://github.com/inngest/inngest-codex-plugin) — same shared skills, plus plugin-specific MCP, eval harnesses, commands, or agents.

Learn more about [Agent Skills](https://agentskills.io).

## Available Skills

| Skill                                                            | Description                                                  | What It Covers                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| [inngest-setup](./skills/inngest-setup/)                         | Set up Inngest in a TypeScript project                       | SDK installation, client config, environment variables, dev server             |
| [inngest-events](./skills/inngest-events/)                       | Design and send Inngest events                               | Event schema, naming conventions, idempotency, fan-out patterns, system events |
| [inngest-durable-functions](./skills/inngest-durable-functions/) | Create and configure Inngest durable functions               | Triggers, step execution, memoization, cancellation, error handling, retries   |
| [inngest-steps](./skills/inngest-steps/)                         | Use Inngest step methods to build durable workflows          | step.run, step.sleep, step.waitForEvent, loops, parallel execution             |
| [inngest-flow-control](./skills/inngest-flow-control/)           | Configure Inngest flow control for functions                 | Concurrency limits, throttling, rate limiting, debounce, priority, batching    |
| [inngest-middleware](./skills/inngest-middleware/)               | Create and use Inngest middleware for cross-cutting concerns | Middleware lifecycle, dependency injection, built-in middleware                |
| [inngest-realtime](./skills/inngest-realtime/)                   | Stream durable workflow updates to a UI in real time         | v4 native realtime, channels, subscription tokens, `useRealtime` hook, SSE     |
| [inngest-cli](./skills/inngest-cli/)                             | Install and use the Inngest CLI and Dev Server               | Dev server, auto-discovery, Docker, testing, MCP server, deployment workflow   |
| [inngest-api-cli](./skills/inngest-api-cli/)                     | Operate Inngest API resources from the terminal             | `inngest api`, Cloud debugging, traces, event runs, invocation, Insights       |
| [inngest-api](./skills/inngest-api/)                             | Use REST API v2 and OpenAPI fallback                        | Raw HTTP, API keys, docs lookup, request shapes, pagination, secret redaction  |
| [inngest-agents](./skills/inngest-agents/)                       | Build durable AI agents and agentic workflows               | AgentKit, `step.ai`, tool calls, multi-agent networks, human approval, realtime |
| [inngest-agent-evals](./skills/inngest-agent-evals/)             | Evaluate AI agents and workflows in production              | Scoring, deferred scorers, sessions, traces, step experiments, Insights        |
| [inngest-brownfield-audit](./skills/inngest-brownfield-audit/)   | Audit an existing codebase for durability gaps              | Repo discovery, anti-pattern detection, incremental Inngest integration plan   |
| [inngest-v3-v4-migration](./skills/inngest-v3-v4-migration/)     | Upgrade a codebase from SDK v3 to v4                        | Usage detection, trigger/schema/serve/realtime API changes, verification       |

## Language Support

**These skills are focused on TypeScript.** Core concepts like events, steps, and flow control apply across all Inngest SDKs, but code examples and setup instructions are TypeScript-specific.

For **Python** or **Go**, refer to the [Inngest documentation](https://www.inngest.com/llms.txt) for language-specific guidance.

## Installation

### Skills.sh

```bash
npx skills add inngest/inngest-skills
```

This installs individual skills into your global `~/.claude/skills/` directory and works with Claude Code, Claude.ai, and other agent runtimes that read skills from that path.

### Claude Code and Codex Plugins

For the full Claude Code experience — skills + dev-server MCP + eval harness + (coming soon) commands and agents — install the Claude Code plugin:

```
/plugin marketplace add inngest/inngest-claude-code-plugin
/plugin install inngest@inngest-claude-code-plugin
```

See the [plugin repo](https://github.com/inngest/inngest-claude-code-plugin) for details.

For Codex, install the [Codex plugin](https://github.com/inngest/inngest-codex-plugin) from its `plugins/inngest` bundle.

### Cursor

Add to your `.cursorrules` file:

```
Load the Inngest skills from https://github.com/inngest/inngest-skills for building with Inngest's durable execution platform.
```

### Other Agents

Reference this repository directly or clone it to your agent's skills directory. Each skill is self-contained with full documentation in its `SKILL.md` file.

## Repository layout

This repo is the **source of truth for the skills themselves**. The Claude Code and Codex plugins pull from here.

```
skills/
├── inngest-setup/
├── inngest-durable-functions/
├── inngest-steps/
├── inngest-events/
├── inngest-flow-control/
├── inngest-middleware/
├── inngest-realtime/
├── inngest-cli/
├── inngest-api-cli/
├── inngest-api/
├── inngest-agents/
├── inngest-agent-evals/
├── inngest-brownfield-audit/
└── inngest-v3-v4-migration/
```

If you're authoring or editing a skill, do it here. The plugin repo syncs from this one.

## Contributing

See [AGENTS.md](./AGENTS.md) for guidelines on editing and maintaining these skills.

## License

Licensed under the Apache License 2.0. See [LICENSE](./LICENSE) for details.
