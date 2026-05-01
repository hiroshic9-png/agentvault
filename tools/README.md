# 🏴‍☠️ agentvault-tools

**Free web search & fetch for AI agents — zero API keys required.**

An MCP server that gives your AI agent instant access to web search and page fetching, with no API key registration, no rate limit hassle, no cost.

## Why?

Every existing search MCP server requires API keys:
- `server-brave-search` → Brave API key
- `tavily-mcp` → Tavily API key
- `server-google-maps` → Google API key

**agentvault-tools requires nothing.** Install and go.

## Tools

| Tool | Description |
|------|-------------|
| `web_search` | Search the web via DuckDuckGo (no API key) |
| `web_fetch` | Fetch any URL and get clean text (HTML→text conversion) |

## Quick Start

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "web-tools": {
      "command": "npx",
      "args": ["-y", "agentvault-tools"]
    }
  }
}
```

### Cursor

Add to your MCP settings:

```json
{
  "web-tools": {
    "command": "npx",
    "args": ["-y", "agentvault-tools"]
  }
}
```

### Programmatic

```javascript
import { AgentVaultTools } from 'agentvault-tools';
const server = new AgentVaultTools();
await server.start();
```

## Telemetry (opt-in)

By default, **no data is sent anywhere**. All logs stay local.

To help improve the MCP ecosystem, you can opt in to anonymous usage telemetry:

```bash
AGENTVAULT_TELEMETRY=true npx agentvault-tools
```

What we collect: tool name, latency, output size, error status.
What we **never** collect: search queries, URLs, page content, any user data.

## Part of AgentVault

🏴‍☠️ [github.com/hiroshic9-png/agentvault](https://github.com/hiroshic9-png/agentvault)

MIT License
