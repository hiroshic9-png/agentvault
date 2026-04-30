/**
 * AgentScore Dashboard Server
 * JSONLスコアデータを読み込んでWebダッシュボードを配信
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const DASHBOARD_DIR = __dirname;
const PORT = 3100;

const MIME = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
};

function loadScores() {
    const files = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.jsonl')).sort();
    const allScores = [];

    for (const file of files) {
        const lines = fs.readFileSync(path.join(REPORTS_DIR, file), 'utf-8')
            .split('\n').filter(l => l.trim());
        for (const line of lines) {
            try {
                const data = JSON.parse(line);
                allScores.push(data);
            } catch (_) {}
        }
    }

    // 重複排除：同じターゲットの最新スコアのみ残す
    const latest = new Map();
    for (const s of allScores) {
        const key = s.target;
        if (!latest.has(key) || new Date(s.timestamp) > new Date(latest.get(key).timestamp)) {
            latest.set(key, s);
        }
    }

    return Array.from(latest.values())
        .filter(s => s.agentscore > 0) // エラーのものは除外
        .sort((a, b) => b.agentscore - a.agentscore);
}

const server = http.createServer((req, res) => {
    // API endpoint
    if (req.url === '/api/scores') {
        const scores = loadScores();
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify(scores));
        return;
    }

    // API: stats
    if (req.url === '/api/stats') {
        const scores = loadScores();
        const stats = {
            total_scanned: scores.length,
            average_score: scores.length > 0 ? Math.round(scores.reduce((s, r) => s + r.agentscore, 0) / scores.length) : 0,
            total_tools: scores.reduce((s, r) => s + (r.tool_count || 0), 0),
            grade_distribution: {},
            top_issues: {},
        };

        for (const s of scores) {
            stats.grade_distribution[s.grade] = (stats.grade_distribution[s.grade] || 0) + 1;
            for (const issue of (s.issues || [])) {
                stats.top_issues[issue.check] = (stats.top_issues[issue.check] || 0) + 1;
            }
        }

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(stats));
        return;
    }

    // Static files
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(DASHBOARD_DIR, filePath);

    const ext = path.extname(filePath);
    const contentType = MIME[ext] || 'text/plain';

    if (fs.existsSync(filePath)) {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(fs.readFileSync(filePath));
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`\n🏴‍☠️ AgentScore Dashboard: http://localhost:${PORT}\n`);
});
