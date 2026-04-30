#!/usr/bin/env node
/**
 * AgentScore CLI
 * 
 * Usage:
 *   agentscore scan "npx -y @modelcontextprotocol/server-filesystem /tmp"
 *   agentscore scan "npx -y @modelcontextprotocol/server-github" --verbose
 *   agentscore batch targets.txt
 */
import { AgentScorer } from './index.js';
import fs from 'fs';

const HELP = `
AgentScore — MCP Server Quality & Security Scanner

Usage:
  agentscore scan <target>     Score a single MCP server
  agentscore batch <file>      Score multiple servers from a file
  agentscore help              Show this help

Options:
  --verbose, -v    Show detailed progress
  --timeout <ms>   Connection timeout (default: 10000)

Examples:
  agentscore scan "npx -y @modelcontextprotocol/server-filesystem /tmp"
  agentscore scan "npx -y @modelcontextprotocol/server-github" -v
`;

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
        console.log(HELP);
        process.exit(0);
    }

    const verbose = args.includes('--verbose') || args.includes('-v');
    const timeoutIdx = args.indexOf('--timeout');
    const timeout = timeoutIdx >= 0 ? parseInt(args[timeoutIdx + 1]) : 10000;

    if (args[0] === 'scan') {
        const target = args[1];
        if (!target) {
            console.error('❌ Target command required. Example: agentscore scan "npx -y @modelcontextprotocol/server-filesystem /tmp"');
            process.exit(1);
        }

        console.log(`\n🔍 Scanning: ${target}\n`);

        const scorer = new AgentScorer({ target, verbose, timeout });
        const report = await scorer.score();

        // 結果表示
        printReport(report);

        // データ蓄積
        const filepath = scorer.saveReport(report);
        console.log(`\n📁 Report saved: ${filepath}`);

        process.exit(report.agentscore > 0 ? 0 : 1);
    }

    if (args[0] === 'batch') {
        const file = args[1];
        if (!file || !fs.existsSync(file)) {
            console.error('❌ Targets file required. One target per line.');
            process.exit(1);
        }

        const targets = fs.readFileSync(file, 'utf-8')
            .split('\n')
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('#'));

        console.log(`\n🔍 Batch scanning ${targets.length} servers...\n`);
        const results = [];

        for (const target of targets) {
            console.log(`━━━ ${target} ━━━`);
            const scorer = new AgentScorer({ target, verbose, timeout });
            const report = await scorer.score();
            printReport(report);
            scorer.saveReport(report);
            results.push(report);
            console.log('');
        }

        // バッチサマリー
        console.log('\n═══════════════════════════════════');
        console.log('📊 Batch Summary');
        console.log('═══════════════════════════════════');
        const sorted = results.sort((a, b) => b.agentscore - a.agentscore);
        for (const r of sorted) {
            const name = r.target.split('/').pop()?.split(' ')[0] || r.target;
            const bar = '█'.repeat(Math.floor(r.agentscore / 5)) + '░'.repeat(20 - Math.floor(r.agentscore / 5));
            console.log(`  ${r.grade.padEnd(3)} ${bar} ${r.agentscore}/100  ${name}`);
        }
        console.log(`\n  Total scanned: ${results.length}`);
        console.log(`  Average score: ${Math.round(results.reduce((s, r) => s + r.agentscore, 0) / results.length)}`);

        process.exit(0);
    }

    console.error(`❌ Unknown command: ${args[0]}`);
    console.log(HELP);
    process.exit(1);
}


function printReport(report) {
    if (report.error) {
        console.log(`  ❌ Error: ${report.error}`);
        return;
    }

    const scoreBar = '█'.repeat(Math.floor(report.agentscore / 5)) + '░'.repeat(20 - Math.floor(report.agentscore / 5));

    console.log(`  ┌─────────────────────────────────────┐`);
    console.log(`  │  AgentScore: ${report.agentscore}/100  Grade: ${report.grade.padEnd(3)}        │`);
    console.log(`  │  ${scoreBar}  │`);
    console.log(`  └─────────────────────────────────────┘`);
    console.log(`  📦 Tools: ${report.tool_count}  📂 Resources: ${report.resource_count}  💬 Prompts: ${report.prompt_count}`);
    console.log(`  ⏱  Scan time: ${report.scan_duration_ms}ms`);

    // Category breakdown
    console.log(`\n  Category Breakdown:`);
    const cats = report.category_scores || {};
    for (const [cat, data] of Object.entries(cats)) {
        const pct = data.pct || 0;
        const miniBar = '▓'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
        console.log(`    ${cat.padEnd(15)} ${miniBar} ${data.score}/${data.max}`);
    }

    // Issues
    const issues = report.issues || [];
    if (issues.length > 0) {
        console.log(`\n  ⚠️  Issues (${issues.length}):`);
        for (const issue of issues.slice(0, 10)) {
            const icon = issue.severity === 'critical' ? '🚨' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
            console.log(`    ${icon} ${issue.check}: ${issue.detail || ''}`);
        }
    }

    // Tools list
    if (report.tools && report.tools.length > 0) {
        console.log(`\n  📦 Tools:`);
        for (const t of report.tools) {
            console.log(`    • ${t.name} (${t.param_count} params)`);
        }
    }
}


main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
