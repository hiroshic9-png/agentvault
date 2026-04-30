/**
 * AgentScore — MCP Server Quality & Security Scorer
 * 
 * MCPサーバーに接続し、以下の観点で自動スコアリング:
 *   1. Tool Description Quality (ツール説明の質)
 *   2. Response Reliability (応答信頼性)
 *   3. Security Posture (セキュリティ姿勢)
 *   4. Performance (パフォーマンス)
 *   5. Protocol Compliance (プロトコル準拠度)
 * 
 * 出力: 0-100 の AgentScore + 詳細レポート
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ListPromptsRequestSchema,
    CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.join(__dirname, '..', 'reports');


export class AgentScorer {
    constructor(options = {}) {
        this.targetCommand = options.target || '';
        this.timeout = options.timeout || 10000;
        this.verbose = options.verbose || false;
        this.client = null;
        this.transport = null;
        this.results = {
            tools: [],
            resources: [],
            prompts: [],
            checks: [],
            scores: {},
        };
    }

    /**
     * MCPサーバーに接続してフルスコアリングを実行
     */
    async score() {
        const startTime = Date.now();
        
        try {
            // 1. サーバー接続
            await this._connect();
            
            // 2. ツール一覧取得 + 分析
            await this._analyzeTools();
            
            // 3. リソース一覧取得
            await this._analyzeResources();
            
            // 4. プロンプト一覧取得
            await this._analyzePrompts();
            
            // 5. セキュリティチェック
            await this._securityChecks();
            
            // 6. パフォーマンステスト
            await this._performanceChecks();
            
            // 7. スコア算出
            const report = this._calculateScore(Date.now() - startTime);
            
            return report;
            
        } catch (e) {
            return {
                target: this.targetCommand,
                error: e.message,
                agentscore: 0,
                grade: 'F',
                timestamp: new Date().toISOString(),
            };
        } finally {
            await this._disconnect();
        }
    }

    async _connect() {
        const parts = this.targetCommand.split(/\s+/);
        const command = parts[0];
        const args = parts.slice(1);

        this.transport = new StdioClientTransport({ command, args });
        this.client = new Client(
            { name: 'agentscore-scanner', version: '0.1.0' },
            { capabilities: {} }
        );

        await this.client.connect(this.transport);
        this._log('✅ Connected to MCP server');
    }

    async _disconnect() {
        try {
            if (this.client) await this.client.close();
        } catch (_) {}
        try {
            if (this.transport) {
                this.transport._process?.kill();
            }
        } catch (_) {}
    }

    // ========================================
    // 1. Tool Description Quality Analysis
    // ========================================
    async _analyzeTools() {
        try {
            const resp = await this.client.listTools();
            const tools = resp.tools || [];
            this.results.tools = tools;
            this._log(`📦 Found ${tools.length} tools`);

            for (const tool of tools) {
                const checks = [];

                // 1a. ツール名の品質
                if (tool.name && tool.name.length > 0) {
                    checks.push({ check: 'has_name', pass: true });
                    // snake_case or camelCase チェック
                    const validName = /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(tool.name);
                    checks.push({
                        check: 'valid_name_format',
                        pass: validName,
                        detail: validName ? null : `Invalid name: ${tool.name}`,
                    });
                } else {
                    checks.push({ check: 'has_name', pass: false });
                }

                // 1b. 説明の品質
                const desc = tool.description || '';
                checks.push({ check: 'has_description', pass: desc.length > 0 });
                checks.push({
                    check: 'description_length',
                    pass: desc.length >= 20,
                    detail: `Length: ${desc.length} chars (min 20)`,
                });
                checks.push({
                    check: 'description_has_verb',
                    pass: /\b(get|set|create|read|write|update|delete|list|search|fetch|send|run|execute|find|check|validate)\b/i.test(desc),
                    detail: 'Description should start with an action verb',
                });

                // 1c. Input Schema の品質
                const schema = tool.inputSchema;
                if (schema) {
                    checks.push({ check: 'has_input_schema', pass: true });
                    const props = schema.properties || {};
                    const propCount = Object.keys(props).length;
                    checks.push({
                        check: 'schema_has_properties',
                        pass: propCount > 0,
                        detail: `${propCount} properties defined`,
                    });

                    // 各プロパティにdescriptionがあるか
                    let propsWithDesc = 0;
                    for (const [_, prop] of Object.entries(props)) {
                        if (prop.description && prop.description.length > 0) propsWithDesc++;
                    }
                    checks.push({
                        check: 'schema_properties_documented',
                        pass: propCount === 0 || propsWithDesc / propCount >= 0.5,
                        detail: `${propsWithDesc}/${propCount} properties have descriptions`,
                    });

                    // required フィールドの定義
                    const required = schema.required || [];
                    checks.push({
                        check: 'schema_has_required',
                        pass: required.length > 0 || propCount === 0,
                        detail: `${required.length} required fields`,
                    });
                } else {
                    checks.push({ check: 'has_input_schema', pass: false });
                }

                // 1d. セキュリティ関連のツール名チェック
                const dangerousPatterns = /\b(exec|shell|eval|system|sudo|rm|delete_all|drop|truncate)\b/i;
                const isDangerous = dangerousPatterns.test(tool.name) || dangerousPatterns.test(desc);
                checks.push({
                    check: 'no_dangerous_patterns',
                    pass: !isDangerous,
                    detail: isDangerous ? `⚠️ Potentially dangerous tool: ${tool.name}` : null,
                    severity: isDangerous ? 'warning' : 'info',
                });

                this.results.checks.push({
                    category: 'tool_quality',
                    tool: tool.name,
                    checks,
                });
            }
        } catch (e) {
            this._log(`⚠️ Tools analysis failed: ${e.message}`);
            this.results.checks.push({
                category: 'tool_quality',
                tool: '_list',
                checks: [{ check: 'tools_list_available', pass: false, detail: e.message }],
            });
        }
    }

    // ========================================
    // 2. Resources Analysis
    // ========================================
    async _analyzeResources() {
        try {
            const resp = await this.client.listResources();
            const resources = resp.resources || [];
            this.results.resources = resources;
            this._log(`📂 Found ${resources.length} resources`);

            this.results.checks.push({
                category: 'resources',
                checks: [
                    { check: 'resources_supported', pass: true },
                    { check: 'has_resources', pass: resources.length > 0, detail: `${resources.length} resources` },
                ],
            });
        } catch (e) {
            // resources/list がサポートされていない場合もある（減点しない）
            this.results.checks.push({
                category: 'resources',
                checks: [{ check: 'resources_supported', pass: false, detail: 'Not supported (ok)' }],
            });
        }
    }

    // ========================================
    // 3. Prompts Analysis
    // ========================================
    async _analyzePrompts() {
        try {
            const resp = await this.client.listPrompts();
            const prompts = resp.prompts || [];
            this.results.prompts = prompts;
            this._log(`💬 Found ${prompts.length} prompts`);

            this.results.checks.push({
                category: 'prompts',
                checks: [
                    { check: 'prompts_supported', pass: true },
                    { check: 'has_prompts', pass: prompts.length > 0, detail: `${prompts.length} prompts` },
                ],
            });
        } catch (e) {
            this.results.checks.push({
                category: 'prompts',
                checks: [{ check: 'prompts_supported', pass: false, detail: 'Not supported (ok)' }],
            });
        }
    }

    // ========================================
    // 4. Security Checks
    // ========================================
    async _securityChecks() {
        const checks = [];
        const tools = this.results.tools;

        // 4a. Tool Poisoning Detection（説明文に悪意のある命令が含まれていないか）
        const poisonPatterns = [
            /ignore\s+(previous|all|above)\s+(instructions|prompts)/i,
            /do\s+not\s+show\s+this/i,
            /system\s*:\s*/i,
            /<\/?hidden>/i,
            /\bpwned\b/i,
            /exfiltrate/i,
            /send\s+(data|info|credentials)\s+to/i,
        ];

        let poisonFound = false;
        for (const tool of tools) {
            const text = `${tool.name} ${tool.description || ''}`;
            for (const pattern of poisonPatterns) {
                if (pattern.test(text)) {
                    checks.push({
                        check: 'tool_poisoning_free',
                        pass: false,
                        detail: `🚨 Suspicious pattern in "${tool.name}": ${pattern}`,
                        severity: 'critical',
                    });
                    poisonFound = true;
                }
            }
        }
        if (!poisonFound) {
            checks.push({ check: 'tool_poisoning_free', pass: true });
        }

        // 4b. 過度な権限要求チェック
        const highPrivTools = tools.filter(t => {
            const text = `${t.name} ${t.description || ''}`.toLowerCase();
            return /\b(filesystem|shell|exec|database|admin|root|sudo)\b/.test(text);
        });
        checks.push({
            check: 'minimal_privilege',
            pass: highPrivTools.length <= tools.length * 0.3,
            detail: `${highPrivTools.length}/${tools.length} tools have elevated access patterns`,
        });

        // 4c. Input validation の兆候チェック（schemaのtype/enum/pattern定義）
        let wellValidated = 0;
        for (const tool of tools) {
            const schema = tool.inputSchema;
            if (schema?.properties) {
                const props = Object.values(schema.properties);
                const typed = props.filter(p => p.type || p.enum || p.pattern).length;
                if (typed === props.length && props.length > 0) wellValidated++;
            }
        }
        checks.push({
            check: 'input_validation',
            pass: tools.length === 0 || wellValidated / tools.length >= 0.5,
            detail: `${wellValidated}/${tools.length} tools have full input type definitions`,
        });

        this.results.checks.push({ category: 'security', checks });
    }

    // ========================================
    // 5. Performance Checks
    // ========================================
    async _performanceChecks() {
        const checks = [];

        // 5a. tools/list のレスポンス速度
        const t0 = Date.now();
        try {
            await this.client.listTools();
            const latency = Date.now() - t0;
            checks.push({
                check: 'tools_list_latency',
                pass: latency < 2000,
                detail: `${latency}ms (threshold: 2000ms)`,
            });
        } catch (e) {
            checks.push({ check: 'tools_list_latency', pass: false, detail: e.message });
        }

        // 5b. ツール数の適正チェック
        const toolCount = this.results.tools.length;
        checks.push({
            check: 'reasonable_tool_count',
            pass: toolCount > 0 && toolCount <= 50,
            detail: `${toolCount} tools (recommended: 1-50)`,
        });

        this.results.checks.push({ category: 'performance', checks });
    }

    // ========================================
    // Score Calculation
    // ========================================
    _calculateScore(totalMs) {
        const weights = {
            tool_quality: 40,
            security: 30,
            performance: 15,
            resources: 5,
            prompts: 5,
            protocol: 5,
        };

        const categoryScores = {};

        for (const [category, weight] of Object.entries(weights)) {
            const catChecks = this.results.checks
                .filter(c => c.category === category)
                .flatMap(c => c.checks || []);

            if (catChecks.length === 0) {
                categoryScores[category] = { score: weight * 0.5, max: weight, pct: 50 };
                continue;
            }

            const passed = catChecks.filter(c => c.pass).length;
            const pct = Math.round((passed / catChecks.length) * 100);
            categoryScores[category] = {
                score: Math.round((passed / catChecks.length) * weight),
                max: weight,
                pct,
                total: catChecks.length,
                passed,
            };
        }

        // Protocol compliance bonus (接続成功 = 5点)
        categoryScores.protocol = { score: 5, max: 5, pct: 100 };

        const totalScore = Object.values(categoryScores).reduce((s, c) => s + c.score, 0);
        const grade = totalScore >= 90 ? 'A+' :
                      totalScore >= 80 ? 'A' :
                      totalScore >= 70 ? 'B' :
                      totalScore >= 60 ? 'C' :
                      totalScore >= 50 ? 'D' : 'F';

        const report = {
            target: this.targetCommand,
            agentscore: totalScore,
            grade,
            category_scores: categoryScores,
            tool_count: this.results.tools.length,
            resource_count: this.results.resources.length,
            prompt_count: this.results.prompts.length,
            tools: this.results.tools.map(t => ({
                name: t.name,
                description: (t.description || '').substring(0, 100),
                param_count: Object.keys(t.inputSchema?.properties || {}).length,
            })),
            issues: this.results.checks
                .flatMap(c => (c.checks || []))
                .filter(c => !c.pass)
                .map(c => ({ check: c.check, detail: c.detail, severity: c.severity || 'info' })),
            scan_duration_ms: totalMs,
            timestamp: new Date().toISOString(),
        };

        this.results.scores = report;
        return report;
    }

    /**
     * レポートをJSONLファイルに保存（データ蓄積）
     */
    saveReport(report) {
        if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
        const date = new Date().toISOString().split('T')[0];
        const filepath = path.join(REPORTS_DIR, `scores_${date}.jsonl`);
        const line = JSON.stringify(report) + '\n';
        fs.appendFileSync(filepath, line, 'utf-8');
        return filepath;
    }

    _log(msg) {
        if (this.verbose) console.log(`[AgentScore] ${msg}`);
    }
}
