# 🏴‍☠️ AgentVault — 告知コンテンツ集 v3

> 投稿先別に最適化した告知文。オーナーがコピペで使えるように。
> Updated: 2026-05-01 — 9ツール統合版（MCP Starter Kit）を軸に全面刷新

---

## 1. Hacker News (Show HN) — メイン投稿

### タイトル（A案：衝撃データ + ソリューション型 — 推奨）
```
Show HN: We patrolled 46 MCP servers – 57% failed. So we built a 9-tool starter kit
```

### タイトル（B案：プロダクト型）
```
Show HN: AgentVault – 9 free tools for AI agents in one install (search, memory, more)
```

### タイトル（C案：シンプルデータ型）
```
Show HN: We patrolled 46 MCP servers – 57% failed to respond
```

### 本文
```
Hi HN,

I built AgentVault — open-source tools for the MCP (Model Context Protocol) ecosystem.

**The problem:** I wrote a patrol agent that connects to 46 MCP servers on npm. 57% failed to even connect. Same error every time: "Connection closed". Many published packages are broken or require undocumented setup.

**The fix:** `npx agentvault-tools` — one command, 9 tools, zero API keys:

- 🔍 Web search (DuckDuckGo)
- 📄 Web page fetching (URL → clean text)
- 🧠 Persistent memory — save/search/list/delete notes (SQLite FTS5, 100% local)
- 🔧 Calculator + timezone conversion

Works with Claude Desktop, Cursor, Windsurf, CrewAI — just add to your MCP config:

```json
{ "mcpServers": { "agentvault": { "command": "npx", "args": ["-y", "agentvault-tools"] } } }
```

We also have 6 more packages:
- Quality scoring for MCP servers (A+ to F) — 21 servers scored, avg 89/100
- Tool poisoning detection (catches hidden prompt injections)
- MCP proxy with full audit logging
- Retry with backoff, result caching

Full ecosystem health report: https://github.com/hiroshic9-png/agentvault/blob/main/intelligence/ecosystem-report-2026-05.md

GitHub: https://github.com/hiroshic9-png/agentvault

Happy to discuss MCP reliability, tool poisoning, or the scoring methodology.
```

---

## 2. Reddit

### r/LocalLLaMA タイトル
```
I built a free MCP starter kit — 9 tools (web search, persistent memory, calc) in one install, zero API keys
```

### r/MachineLearning タイトル
```
[P] 57% of MCP servers on npm fail to connect — I built a toolkit to fix the ecosystem
```

### r/SideProject タイトル
```
I patrolled 46 MCP servers and found 57% are broken. So I built a 9-tool starter kit for AI agents
```

### 本文 (共通)
```
**TL;DR:** `npx agentvault-tools` gives your AI agent 9 tools instantly — web search, persistent memory, calculator, and more. No API keys. No setup.

---

I wrote a patrol agent that connects to every MCP server on npm and tests them automatically.

**The result:** 57% failed to connect. All with the same error. Many packages are published but broken.

So I built AgentVault — 7 open-source packages:

**The Starter Kit (1 install = 9 tools):**
🔍 Web search (DuckDuckGo — no API key)
📄 Web page fetching
🧠 Persistent memory — save, search, list, delete (SQLite FTS5, 100% local)
🔧 Calculator + timezone conversion

**Infrastructure:**
📊 Quality scoring for MCP servers (A+ to F)
🛡️ Tool poisoning detection
🔌 MCP proxy with audit logging
🔄 Retry with fallback
⚡ Smart result caching

All 100% local-first. Your data never leaves your machine.

**Quick start:**
```json
// claude_desktop_config.json or .cursor/mcp.json
{ "mcpServers": { "agentvault": { "command": "npx", "args": ["-y", "agentvault-tools"] } } }
```

Full report: https://github.com/hiroshic9-png/agentvault/blob/main/intelligence/ecosystem-report-2026-05.md

GitHub: https://github.com/hiroshic9-png/agentvault
```

---

## 3. X (Twitter) — スレッド形式

### ツイート1（フック：衝撃データ + ソリューション）
```
🏴‍☠️ I patrolled 46 MCP servers on npm.

57% failed to even connect.

So I built a starter kit:
→ npx agentvault-tools
→ 9 tools. Zero API keys. One install.

Web search, persistent memory, calculator — everything an AI agent needs to start.

🧵
```

### ツイート2（9ツール詳細）
```
What you get with one command:

🔍 web_search — DuckDuckGo (free)
📄 web_fetch — URL → clean text
🧠 save_memory — persist notes (SQLite)
🧠 search_memory — full-text search
🧠 list/delete/stats — manage it all
🔧 calc — math expressions
🔧 datetime — timezone conversion

100% local. Your data stays on your machine.
```

### ツイート3（インテグレーション）
```
Works with everything:

Claude Desktop:
{ "mcpServers": { "agentvault": { "command": "npx", "args": ["-y", "agentvault-tools"] } } }

Cursor, Windsurf, CrewAI — same config.

Plus 6 more packages: security scoring, tool poisoning detection, audit proxy, retry, cache.

github.com/hiroshic9-png/agentvault
```

### ツイート4（CTA）
```
The MCP ecosystem is growing fast but 57% of servers are broken.

We patrol it daily with automated agents and publish quality scores.

Full ecosystem report:
github.com/hiroshic9-png/agentvault/blob/main/intelligence/ecosystem-report-2026-05.md

⭐ If this is useful: github.com/hiroshic9-png/agentvault
```

---

## 投稿タイミング推奨

| プラットフォーム | 最適時間 (JST) | 予定 |
|----------------|---------------|------|
| Hacker News | 火曜 23:00 | **5/6 (火)** |
| Reddit | 水曜 00:00 | 5/7 (水) or HN同日 |
| X (Twitter) | HN投稿と同時 | 5/6 (火) 23:00 |

> **戦略**: HN投稿を最優先。タイトルはA案（データ+ソリューション型）推奨。
> HNで反応が良ければ即座にReddit/Xも連射。反応が弱ければB案タイトルで再投稿を検討。
> 
> **v3での変更点:**
> - 9ツール統合版を全面に押し出し（v2は「6 tools」表記だった）
> - 「MCP Starter Kit」としてのポジショニングを強調
> - メモリ機能（ローカルファースト）を差別化要素として前面に
> - Claude Desktop / Cursor / Windsurf の設定例をコピペ可能な形で提示
> - r/SideProjectを投稿先に追加
