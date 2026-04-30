# AgentVault Gateway 🏴‍☠️

> **All agent traffic flows through us.**  
> MCP Proxy that intercepts, logs, and secures agent-to-tool communication.

[![npm version](https://img.shields.io/npm/v/agentvault-gateway.svg)](https://www.npmjs.com/package/agentvault-gateway)
[![license](https://img.shields.io/npm/l/agentvault-gateway.svg)](https://github.com/agentvault/gateway/blob/main/LICENSE)

## The Problem

AI agents call external tools via MCP (Model Context Protocol), but you have **zero visibility** into what they're doing:

- What tools did the agent call?
- What data did it send?
- Did it try anything dangerous?
- How much did it cost?

## The Solution

AgentVault Gateway sits between your agent and any MCP server as a transparent proxy:

```
Without Gateway:
  Agent → MCP Server (GitHub, Slack, DB...)
  ❌ No logs. No visibility. No audit trail.

With Gateway:
  Agent → [AgentVault Gateway] → MCP Server
                    ↓
            📊 Full action log
            🔒 Security filtering  
            💰 Cost tracking
```

## Quick Start

```bash
npx agentvault-gateway --target "npx -y @modelcontextprotocol/server-filesystem /tmp"
```

That's it. Your agent now connects to the Gateway instead of the MCP server directly. All traffic is logged to `./agentvault-logs/`.

### With Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "github-via-vault": {
      "command": "npx",
      "args": [
        "agentvault-gateway",
        "--target", "npx -y @modelcontextprotocol/server-github"
      ]
    }
  }
}
```

## Features

| Feature | Description |
|---------|-------------|
| 📊 **Audit Log** | Every tool call recorded with timestamps, inputs, outputs, latency |
| 🔒 **Security Filter** | Block dangerous operations (`DELETE`, `DROP`, `rm -rf`, etc.) |
| 🚦 **Rate Limiting** | Prevent runaway agents from flooding your tools |
| 📡 **Telemetry** | Optional cloud sync for cross-session analytics |
| 🧩 **Zero Config** | Works with any MCP server. No code changes needed |

## How It Works

1. **Agent connects** to Gateway via stdio (standard MCP protocol)
2. **Gateway spawns** the target MCP server as a child process
3. **Every request** is intercepted, logged, security-checked, then forwarded
4. **Every response** is logged and returned to the agent unchanged
5. **Logs** are written to JSONL files for easy analysis

## Configuration

### CLI Options

```bash
agentvault-gateway \
  --target "npx -y @modelcontextprotocol/server-github" \
  --log-dir ./my-logs \
  --no-telemetry
```

### JSON Config

```json
{
  "target": "npx -y @modelcontextprotocol/server-github",
  "security": {
    "block_patterns": ["DELETE", "DROP", "TRUNCATE", "rm -rf"],
    "max_requests_per_minute": 60
  },
  "telemetry": {
    "enabled": true,
    "endpoint": "https://api.agentvault.dev/telemetry"
  },
  "log": {
    "storage": "local",
    "path": "./agentvault-logs",
    "format": "jsonl"
  }
}
```

## Log Format

Each tool call generates a JSONL entry:

```json
{
  "id": "av_1714500000000_abc123",
  "timestamp": "2026-04-30T15:00:00.000Z",
  "event_type": "tool_call",
  "tool_name": "read_file",
  "input_summary": { "path": "/src/index.js" },
  "output_size_bytes": 2048,
  "latency_ms": 142,
  "blocked": false,
  "source": "cli"
}
```

## Programmatic Usage

```javascript
import { AgentVaultGateway } from 'agentvault-gateway';

const gateway = new AgentVaultGateway({
  target: 'npx -y @modelcontextprotocol/server-github',
  logDir: './logs',
  security: {
    blockPatterns: ['DELETE', 'DROP'],
    maxRequestsPerMinute: 30
  }
});

await gateway.start();
```

## Privacy

- All logs are stored **locally by default**
- Cloud telemetry is **opt-out** — disable with `--no-telemetry`
- Telemetry data is anonymized (no PII, no raw content)
- Only metadata is collected: tool names, latency, error rates

## Requirements

- Node.js >= 18.0.0
- Any MCP-compatible server as target

## License

[MIT](./LICENSE)

---

**Built by [AgentVault](https://agentvault.dev)** — Making AI agents observable, secure, and accountable.
