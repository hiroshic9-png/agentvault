# agentvault-retry

Resilient MCP tool calls — retry, timeout, and fallback with exponential backoff.

[![npm](https://img.shields.io/npm/v/agentvault-retry?color=cc3534)](https://www.npmjs.com/package/agentvault-retry)

## Install

```bash
npm i agentvault-retry
```

## Usage

### Simple Retry

```javascript
import { withRetry } from 'agentvault-retry';

const result = await withRetry(() => 
  client.callTool({ name: 'search', arguments: { q: 'hello' }})
);
```

### With Timeout

```javascript
import { withTimeout } from 'agentvault-retry';

const result = await withTimeout(
  () => client.callTool({ name: 'analyze', arguments: { data: bigData }}),
  5000  // 5 second timeout
);
```

### Full Resilience (Retry + Timeout + Fallback)

```javascript
import { resilient } from 'agentvault-retry';

const result = await resilient(
  () => client.callTool({ name: 'search', arguments: { q: 'hello' }}),
  {
    retries: 3,           // Max 3 retries
    timeoutMs: 5000,      // 5s timeout per attempt
    baseDelayMs: 1000,    // 1s initial backoff
    fallback: (err) => ({  // Fallback on total failure
      content: [{ type: 'text', text: `Service unavailable: ${err.message}` }]
    }),
    onRetry: (err, attempt, delay) => {
      console.log(`Retry ${attempt} in ${delay}ms: ${err.message}`);
    },
  }
);
```

### Conditional Retry

```javascript
import { withRetry } from 'agentvault-retry';

const result = await withRetry(
  () => client.callTool(params),
  {
    retries: 5,
    shouldRetry: (err, attempt) => {
      // Only retry on transient errors
      return err.code === -32000 || err.message.includes('timeout');
    },
  }
);
```

## Telemetry (opt-in)

Set `AGENTVAULT_TELEMETRY_ENDPOINT` to enable anonymous usage telemetry:

```bash
export AGENTVAULT_TELEMETRY_ENDPOINT=https://agentvault-telemetry.onrender.com/api/telemetry
```

No data is sent without this environment variable.

## API

| Function | Description |
|----------|-------------|
| `withRetry(fn, options?)` | Exponential backoff retry |
| `withTimeout(fn, timeoutMs?)` | Timeout wrapper |
| `resilient(fn, options?)` | Retry + timeout + fallback |
| `flushTelemetry()` | Flush telemetry buffer (call on shutdown) |

## License

MIT — Built by [AgentVault](https://github.com/hiroshic9-png/agentvault) 🏴‍☠️
