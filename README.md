# Inngest Agent Skills

Agent Skills for building with Inngest's durable execution platform. These skills provide AI agents with comprehensive guidance on creating reliable, fault-tolerant applications using Inngest.

Learn more about [Agent Skills](https://agentskills.io) and [Inngest](https://inngest.com).

## Available Skills

| Skill                                                            | Description                                                  | What It Covers                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| [inngest-setup](./skills/inngest-setup/)                         | Set up Inngest in a TypeScript project                       | SDK installation, client config, environment variables, dev server             |
| [inngest-events](./skills/inngest-events/)                       | Design and send Inngest events                               | Event schema, naming conventions, idempotency, fan-out patterns, system events |
| [inngest-durable-functions](./skills/inngest-durable-functions/) | Create and configure Inngest durable functions               | Triggers, step execution, memoization, cancellation, error handling, retries   |
| [inngest-steps](./skills/inngest-steps/)                         | Use Inngest step methods to build durable workflows          | step.run, step.sleep, step.waitForEvent, loops, parallel execution             |
| [inngest-flow-control](./skills/inngest-flow-control/)           | Configure Inngest flow control for functions                 | Concurrency limits, throttling, rate limiting, debounce, priority, batching    |
| [inngest-middleware](./skills/inngest-middleware/)               | Create and use Inngest middleware for cross-cutting concerns | Middleware lifecycle, dependency injection, built-in middleware                |

## Language Support

**These skills are focused on TypeScript.** Core concepts like events, steps, and flow control apply across all Inngest SDKs, but code examples and setup instructions are TypeScript-specific.

For **Python** or **Go**, refer to the [Inngest documentation](https://www.inngest.com/llms.txt) for language-specific guidance.

## Installation

### Claude Code

```bash
/plugin marketplace add inngest/inngest-skills
/plugin install inngest-skills@inngest-agent-skills
```

### Skills.sh

```bash
npx skills add inngest/inngest-skills
```

### Cursor

Add to your `.cursorrules` file:

```
Load the Inngest skills from https://github.com/inngest/inngest-skills for building with Inngest's durable execution platform.
```

### Other Agents

Reference this repository directly or clone it to your agent's skills directory. Each skill is self-contained with full documentation in its `SKILL.md` file.

## Contributing

See [AGENTS.md](./AGENTS.md) for guidelines on editing and maintaining these skills.

## License

Licensed under the Apache License 2.0. See [LICENSE](./LICENSE) for details.
