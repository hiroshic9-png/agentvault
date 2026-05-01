# 🏴‍☠️ AgentVault — 告知コンテンツ集 v2

> 投稿先別に最適化した告知文。オーナーがコピペで使えるように。
> Updated: 2026-05-01 — agentvault-tools追加、エコシステムレポート反映

---

## 1. Hacker News (Show HN) — メイン投稿

### タイトル（A案：衝撃データ型）
```
Show HN: We patrolled 46 MCP servers – 57% failed to respond
```

### タイトル（B案：ツール型）
```
Show HN: AgentVault – Free web search for AI agents, plus MCP quality scoring
```

### 本文
```
Hi HN,

I built AgentVault — a set of open-source tools for the MCP (Model Context Protocol) ecosystem.

The big finding: I wrote a patrol agent that connects to 46 MCP servers on npm, enumerates their tools, and calls read-only operations. **57% of servers failed to even connect.** Every failure was the same error: `Connection closed`. Many published packages are broken or require undocumented setup.

What AgentVault does:

1. **agentvault-tools** — Free web search & fetch MCP server. No API keys required. Just `npx agentvault-tools` and your agent can search the web. (Every existing search MCP server requires API key registration.)

2. **agentvault-score** — Automated quality scoring (A+ to F) for any MCP server. We've scored 21 servers, average: 89/100. SQLite scored highest (98/100).

3. **agentvault-guard** — Runtime tool poisoning detection. Catches hidden instructions in tool descriptions.

4. **agentvault-gateway** — Transparent MCP proxy with full audit logging.

Plus retry, cache, and more — 6 packages total.

Full ecosystem health report: https://github.com/hiroshic9-png/agentvault/blob/main/intelligence/ecosystem-report-2026-05.md

Live site: https://hiroshic9-png.github.io/agentvault/
GitHub: https://github.com/hiroshic9-png/agentvault

Happy to answer questions about MCP reliability, tool poisoning, or the scoring methodology.
```

---

## 2. Reddit

### r/LocalLLaMA タイトル
```
57% of MCP servers on npm fail to respond — I built a patrol agent to test them all
```

### r/MachineLearning タイトル
```
[P] AgentVault: We tested 46 MCP servers — here's what we found about ecosystem reliability
```

### 本文 (共通)
```
I wrote a patrol agent that connects to every MCP server on npm and tests them automatically.

The result: 57% failed to connect. All with the same error. Many packages are published but broken.

So I built AgentVault — 6 open-source tools:

🔍 **agentvault-tools** — Free web search for AI agents. No API keys. `npx agentvault-tools`
📊 **agentvault-score** — Quality scoring for MCP servers (A+ to F)
🛡️ **agentvault-guard** — Tool poisoning detection
🔌 **agentvault-gateway** — MCP proxy with audit logging
🔄 **agentvault-retry** — Resilient MCP calls with fallback
⚡ **agentvault-cache** — Smart result caching

Full report: https://github.com/hiroshic9-png/agentvault/blob/main/intelligence/ecosystem-report-2026-05.md

Try it:
```bash
npx agentvault-tools
npx agentvault-score scan "npx -y @modelcontextprotocol/server-memory"
```

GitHub: https://github.com/hiroshic9-png/agentvault
```

---

## 3. X (Twitter) — スレッド形式

### ツイート1（フック：衝撃データ）
```
🏴‍☠️ I patrolled 46 MCP servers on npm.

57% failed to even connect.

All 26 failures: same error — "Connection closed"

Many packages are published but completely broken.

Full report → github.com/hiroshic9-png/agentvault/blob/main/intelligence/ecosystem-report-2026-05.md
```

### ツイート2（ソリューション）
```
So I built 6 tools to fix the MCP ecosystem:

🔍 Free web search (no API keys!)
📊 Quality scoring (A+ to F)
🛡️ Tool poisoning detection
🔌 Audit proxy
🔄 Auto-retry with fallback
⚡ Smart caching

All open source: github.com/hiroshic9-png/agentvault
```

### ツイート3（CTA）
```
The easiest way to try it:

npx agentvault-tools

→ Your AI agent gets free web search instantly.
   No API keys. No registration. No cost.

npm: npmjs.com/package/agentvault-tools
```

---

## 投稿タイミング推奨

| プラットフォーム | 最適時間 (JST) | 予定 |
|----------------|---------------|------|
| Hacker News | 火曜 23:00 | **5/6 (火)** |
| Reddit | 月曜 24:00 | 5/5 (月) or 5/6 (火) |
| X (Twitter) | 水曜 22:00 | 5/7 (水) or HNと同日 |

> **推奨**: HN投稿を最優先。Reddit/Xは反応を見て同日〜翌日。
> HNタイトルはA案（衝撃データ型）の方がクリック率が高い見込み。
