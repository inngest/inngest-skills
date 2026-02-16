# AGENTS.md - Guidelines for AI Agents

This repository contains Agent Skills for building with Inngest's durable execution platform. These guidelines help AI coding agents edit and maintain these skills effectively.

## Repository Structure

Each skill is a directory with a `SKILL.md` file containing the complete skill documentation:

```
inngest-skills/
├── inngest-setup/           # SDK installation & project setup
├── inngest-events/          # Event design patterns
├── inngest-durable-functions/ # Function configuration
├── inngest-steps/           # Workflow building with steps
├── inngest-flow-control/    # Concurrency & rate limiting
└── inngest-middleware/      # Cross-cutting concerns
    └── references/          # Detailed reference material
```

## Agent Skills Specification

Follow the official [Agent Skills specification](https://agentskills.io/specification) for file formats, naming conventions, and content structure.

## Editing Guidelines

### File Size & Organization
- **Keep SKILL.md under 500 lines** - this is a hard limit for readability and token efficiency
- For detailed content, create a `references/` subdirectory with focused markdown files
- Link to reference files from the main SKILL.md with clear context

### YAML Frontmatter
Always include complete YAML frontmatter:
```yaml
---
name: skill-name
description: Complete, keyword-rich description of what this skill does and covers
---
```

**The description field is critical** - it's how agents decide whether to load the skill. Make it:
- Action-oriented (use verbs like "create", "configure", "build")
- Keyword-rich (include specific technologies and patterns)
- Complete but concise (cover all major topics)

### Writing Style
- **Be prescriptive, not descriptive**: Write "always use X" not "consider using X"
- **Show don't tell**: Include complete, copy-pasteable code examples with full imports
- **Bold critical information**: Use **bold** for gotchas, warnings, and key concepts
- **Structure for scanning**: Use headers, bullets, and tables for easy navigation

### Code Examples
- **Include full imports** - never assume context
- **Make examples complete** - agents should be able to copy-paste and run
- **Use TypeScript as primary language** - include Python/Go only when specifically helpful
- **Show working examples first**, then explain variations

Example structure:
```typescript
// ✅ Complete working example
import { Inngest } from "inngest";

const inngest = new Inngest({ id: "my-app" });

export default inngest.createFunction(
  { id: "example-function" },
  { event: "user.created" },
  async ({ event, step }) => {
    // Working code here
  }
);
```

### DO/DON'T Patterns
Always show both what to do and what to avoid:

```typescript
// ✅ DO: Put API calls inside steps
const user = await step.run("get-user", () => 
  fetchUser(event.data.userId)
);

// ❌ DON'T: API calls outside steps will re-run
const user = await fetchUser(event.data.userId); // Will run multiple times!
```

### Cross-References
- Link to related skills when concepts overlap
- Reference specific sections: `See [inngest-events](../inngest-events/SKILL.md#event-schema)`
- Create logical learning paths for agents

### Headers & Structure
Use consistent header patterns:
- `## Core Concepts` for fundamental understanding
- `## Quick Reference` for common patterns
- `## Examples` for working code
- `## Common Patterns` for advanced usage
- `## Troubleshooting` for gotchas and solutions

## Testing Guidelines

### Code Verification
- **All code examples must compile** - test with TypeScript compiler
- **Verify against official docs** - cross-reference with https://inngest.com/llms.txt
- **Test complete examples** - ensure imports, types, and syntax are correct

### Documentation Accuracy
- Check links to Inngest documentation
- Verify API signatures match current SDK version
- Ensure environment variables and configuration examples work

### Cross-Reference Validation
- Confirm links to other skills work
- Check that referenced sections exist
- Ensure consistency across related skills

## Naming Conventions

### Skill Directories
- Use lowercase with hyphens: `inngest-flow-control`
- Always prefix with `inngest-`
- Be descriptive: prefer `inngest-durable-functions` over `inngest-functions`

### Reference Files
- Use descriptive names: `dependency-injection.md`, `built-in-middleware.md`
- Group related concepts in single files
- Keep filenames short but clear

### Code Examples
- Use realistic function names: `processPayment`, `sendNotification`
- Include meaningful event names: `user.created`, `payment.completed`
- Show practical use cases, not abstract examples

## Content Guidelines

### What to Include
- **Practical patterns** agents will actually use
- **Complete working examples** for every major concept
- **Error handling patterns** and retry strategies
- **Performance considerations** and best practices
- **Integration patterns** with common tools and frameworks

### What to Avoid
- **Incomplete examples** that won't run
- **Abstract concepts** without practical application
- **Outdated patterns** or deprecated APIs
- **Overly verbose explanations** - keep it actionable
- **Missing error cases** - show how things fail and recover

## Maintenance

### Regular Updates
- Sync with Inngest SDK releases
- Update examples for new features
- Remove deprecated patterns
- Keep reference links current

### Quality Checks
- Verify all code examples still compile
- Test links to external documentation
- Check that file sizes stay under limits
- Ensure descriptions remain accurate

Remember: These skills are tools for AI agents building production applications. Prioritize clarity, completeness, and correctness over cleverness.