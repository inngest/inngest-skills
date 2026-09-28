# Local MCP setup

Use this workflow when the user requests local Dev Server MCP setup or needs
to troubleshoot an existing local connection. Installing the Cloud plugin or
investigating a Cloud run does not opt the user into local MCP.

## Connect

1. Confirm this host can reach the user's Dev Server. Hosted chat cannot reach
   a server on the user's computer; provide the local setup instructions there
   instead of configuring localhost in the hosted environment.
2. Inspect existing MCP configuration for `inngest-dev` or another connection
   to the same Dev Server. Reuse a working connection rather than add a duplicate.
   Use that connection’s configured name for local calls, even if it is not
   `inngest-dev`. Preserve `inngest-cloud` and unrelated servers.
3. Start the Dev Server as part of the requested local development setup, or
   use the one already running. Read its actual URL and port from startup output
   or existing project configuration. The examples below assume port 8288;
   substitute the actual port. Do not add OAuth headers to the local connection.
4. Add the local connection using the host-specific option below. Registration
   is a one-time setup, not something to repeat on every session.
5. Refresh the host's MCP connections or open a new session if the new tools
   aren't visible. Inspect its live tool schema and use a read-only discovery
   tool such as `get_apps` or `list_functions` to confirm the expected app or
   function. Tool names depend on the Dev Server version. Do not send an event
   or invoke a function just to verify connectivity.

### Claude Code

Run from the user's application directory. `--scope local` keeps this connection
personal to that project rather than adding it for every project:

```bash
claude mcp add --scope local --transport http inngest-dev http://127.0.0.1:8288/mcp
```

Use `/mcp` to inspect the connection and reconnect after starting the Dev Server.
To remove this opt-in connection:

```bash
claude mcp remove --scope local inngest-dev
```

### Codex

For a project-only connection, merge this entry into the application's
`.codex/config.toml`, preserving existing settings. Project configuration is
loaded only for trusted projects. Don't commit a personal port choice unless
it is intended to be shared by the project.

```toml
[mcp_servers.inngest-dev]
url = "http://127.0.0.1:8288/mcp"
enabled = true
required = false
```

Set `enabled = false` when local MCP is not needed. `required = false` avoids
making this server a startup requirement; it does not suppress connection
errors while the entry is enabled and the Dev Server is offline.

If the user prefers one connection across projects, use the user-level CLI
instead of adding a second project entry:

```bash
codex mcp add inngest-dev --url http://127.0.0.1:8288/mcp
```

To remove that user-level connection:

```bash
codex mcp remove inngest-dev
```

## Route and recover

- Keep Cloud and local tools distinct. Choose the configured local connection
  (`inngest-dev` by default) for local apps and
  `inngest-cloud` for deployed apps. Ask which target is intended when unclear.
- Local being unavailable does not mean the Cloud account needs reconnection.
  Start the intended Dev Server, correct its configured port, or disable/remove
  the local connection when it is no longer needed.
- If the port belongs to a different app or service, correct the target rather
  than treating its response as the user's intended Dev Server.
- Honor the requested operation on either server. A read-only investigation
  does not authorize sending events, invoking functions, or rerunning work.
