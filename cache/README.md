# ⚡ agentvault-cache

[![npm version](https://img.shields.io/npm/v/agentvault-cache?color=cc3534)](https://www.npmjs.com/package/agentvault-cache)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**Smart caching for MCP tool results — reduce latency, cut costs, eliminate redundant calls.**

## Why?

MCP tool calls can be slow and expensive. If your agent calls the same tool with the same arguments multiple times, you're wasting time and money. `agentvault-cache` wraps any tool call with intelligent TTL-based caching.

## Quick Start

```javascript
import { createCache } from 'agentvault-cache';

const cache = createCache({ ttlMs: 60000 }); // 1 minute TTL

// Wrap any async function:
const result = await cache.wrap('search:test', () => callTool('search', { query: 'test' }));

// Second call with same key → instant, from cache
const cached = await cache.wrap('search:test', () => callTool('search', { query: 'test' }));
```

## Features

| Feature | Description |
|---------|-------------|
| **TTL-based expiry** | Entries auto-expire after configurable duration |
| **LRU eviction** | Least recently used entries evicted when cache is full |
| **Per-entry TTL** | Override TTL for specific entries |
| **Hit rate stats** | Monitor cache effectiveness with `.stats()` |
| **Zero dependencies** | Pure JavaScript, no external deps |

## API

### `createCache(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ttlMs` | number | `300000` | Default TTL in milliseconds |
| `maxSize` | number | `1000` | Max entries before LRU eviction |

### `cache.wrap(key, fn)`

Cache the result of `fn()` under `key`. If a non-expired entry exists, returns it immediately.

### `cache.get(key)`

Get a cached entry. Returns `undefined` if not found or expired.

### `cache.set(key, value, ttlMs?)`

Manually set a cache entry with optional per-entry TTL.

### `cache.invalidate(key)`

Remove a specific entry.

### `cache.clear()`

Remove all entries.

### `cache.stats()`

Returns `{ hits, misses, hitRate, size }`.

## Part of AgentVault

🏴‍☠️ **[AgentVault](https://github.com/hiroshic9-png/agentvault)** — The essential toolkit for AI agents.

| Package | What it does |
|---------|-------------|
| [agentvault-tools](https://www.npmjs.com/package/agentvault-tools) | 🛠️ 9-tool MCP starter kit (search, memory, calc) |
| [agentvault-memory](https://www.npmjs.com/package/agentvault-memory) | 🧠 Local-first persistent memory |
| [agentvault-guard](https://www.npmjs.com/package/agentvault-guard) | 🛡️ Tool poisoning detection |
| [agentvault-gateway](https://www.npmjs.com/package/agentvault-gateway) | 🔌 MCP proxy with audit logging |
| [agentvault-score](https://www.npmjs.com/package/agentvault-score) | 📊 Quality scoring (A+ to F) |
| [agentvault-retry](https://www.npmjs.com/package/agentvault-retry) | 🔄 Resilient calls with backoff |
| **agentvault-cache** | ⚡ Smart result caching (you are here) |

MIT License
