/**
 * AgentScore Dashboard — Frontend Logic
 */

const GRADE_COLORS = {
    'A+': '#34d399',
    'A':  '#60a5fa',
    'B':  '#fbbf24',
    'C':  '#fb923c',
    'D':  '#f87171',
    'F':  '#ef4444',
};

const ISSUE_DESCRIPTIONS = {
    'schema_properties_documented': 'Tool parameters lack descriptions — LLMs struggle with undocumented fields',
    'description_has_verb': 'Tool description missing action verb — makes tool selection harder for agents',
    'schema_has_required': 'No required fields defined — agents may omit critical parameters',
    'schema_has_properties': 'Empty input schema — tool accepts no parameters',
    'description_length': 'Tool description too short (< 20 chars) — insufficient for agent understanding',
    'no_dangerous_patterns': 'Potentially dangerous tool detected (exec/shell/delete)',
    'resources_supported': 'Resources endpoint not supported',
    'prompts_supported': 'Prompts endpoint not supported',
    'has_input_schema': 'Tool missing input schema definition',
    'reasonable_tool_count': 'Unusual number of tools (0 or >50)',
    'tool_poisoning_free': 'Suspicious patterns detected in tool descriptions',
    'minimal_privilege': 'High proportion of elevated-access tools',
    'input_validation': 'Insufficient input type validation in schemas',
};

function extractName(target) {
    // Extract readable name from npx command
    const match = target.match(/@[\w-]+\/([\w-]+)/);
    if (match) return match[1];
    const parts = target.split(/\s+/);
    return parts[parts.length - 1] || target;
}

function getGradeColor(grade) {
    return GRADE_COLORS[grade] || '#888';
}

async function loadDashboard() {
    try {
        const [scoresRes, statsRes] = await Promise.all([
            fetch('/api/scores'),
            fetch('/api/stats'),
        ]);
        const scores = await scoresRes.json();
        const stats = await statsRes.json();

        renderHeader(stats);
        renderGrades(stats.grade_distribution);
        renderLeaderboard(scores);
        renderIssues(stats.top_issues);

        document.getElementById('footerDate').textContent = new Date().toLocaleDateString('ja-JP', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
        });
    } catch (e) {
        console.error('Failed to load dashboard:', e);
    }
}

function renderHeader(stats) {
    document.querySelector('#headerTotal .stat-value').textContent = stats.total_scanned;
    document.querySelector('#headerAvg .stat-value').textContent = stats.average_score;
    document.querySelector('#headerTools .stat-value').textContent = stats.total_tools;
}

function renderGrades(dist) {
    const grid = document.getElementById('gradeGrid');
    const grades = ['A+', 'A', 'B', 'C', 'D', 'F'];

    grid.innerHTML = grades.map((g, i) => {
        const count = dist[g] || 0;
        const color = getGradeColor(g);
        return `
            <div class="grade-card" style="animation-delay: ${i * 60}ms; border-left: 3px solid ${color};">
                <div class="grade-letter" style="color: ${color}">${g}</div>
                <div class="grade-count">${count}</div>
                <div class="grade-label">servers</div>
            </div>
        `;
    }).join('');
}

function renderLeaderboard(scores) {
    const lb = document.getElementById('leaderboard');

    lb.innerHTML = scores.map((s, i) => {
        const rank = i + 1;
        const name = extractName(s.target);
        const color = getGradeColor(s.grade);
        const rankClass = rank <= 3 ? `top${rank}` : '';
        const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;

        const tools = (s.tools || []).map(t =>
            `<span class="tool-pill">${t.name}</span>`
        ).join('');

        const categories = s.category_scores || {};
        const catBars = Object.entries(categories).map(([cat, data]) => {
            const pct = data.pct || 0;
            const catColor = pct >= 80 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171';
            return `<span class="tool-pill" style="color:${catColor};border-color:${catColor}33;background:${catColor}11">${cat} ${data.score}/${data.max}</span>`;
        }).join('');

        return `
            <div class="lb-row" style="animation-delay: ${i * 40}ms" onclick="this.classList.toggle('expanded')">
                <div class="lb-rank ${rankClass}">${rankIcon}</div>
                <div class="lb-info">
                    <div class="lb-name">${name}</div>
                    <div class="lb-target">${s.target}</div>
                </div>
                <div class="lb-bar-wrap">
                    <div class="lb-bar">
                        <div class="lb-bar-fill" style="width:${s.agentscore}%;background:${color};"></div>
                    </div>
                </div>
                <div class="lb-score" style="color:${color}">${s.agentscore}</div>
                <div class="lb-grade" style="color:${color}">${s.grade}</div>
            </div>
        `;
    }).join('');
}

function renderIssues(issues) {
    const grid = document.getElementById('issuesGrid');
    const sorted = Object.entries(issues)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8);

    grid.innerHTML = sorted.map(([check, count], i) => {
        const desc = ISSUE_DESCRIPTIONS[check] || '';
        return `
            <div class="issue-card" style="animation-delay: ${i * 60}ms">
                <div class="issue-count">${count}</div>
                <div class="issue-info">
                    <div class="issue-name">${check.replace(/_/g, ' ')}</div>
                    <div class="issue-desc">${desc}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Export data as JSON
async function exportJSON() {
    try {
        const res = await fetch('/api/scores');
        const scores = await res.json();
        const blob = new Blob([JSON.stringify(scores, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agentscore-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error('Export failed:', e);
    }
}

// Auto-refresh every 30 seconds
loadDashboard();
setInterval(loadDashboard, 30000);
