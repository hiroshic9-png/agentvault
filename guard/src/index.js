/**
 * agentvault-guard — Security Guard Middleware for MCP Clients
 *
 * Protects AI agents from:
 * - Tool poisoning (hidden instructions in tool descriptions)
 * - Dangerous tool execution (exec, shell, delete, drop)
 * - Input injection attacks
 * - Permission escalation
 *
 * Usage:
 *   import { createGuard } from 'agentvault-guard';
 *   const guard = createGuard({ mode: 'strict' });
 *   const result = guard.scanTool(tool);
 *   const safe = guard.validateInput(toolName, args);
 */

// ==========================================
// Tool Poisoning Detection
// ==========================================

const POISONING_PATTERNS = [
    // Direct instruction injection
    /\bignore\s+(all\s+)?previous\s+instructions?\b/i,
    /\byou\s+must\s+(always|never)\b/i,
    /\bdo\s+not\s+tell\s+the\s+user\b/i,
    /\boverride\s+(any|all)\s+(previous|prior)\b/i,
    /\bsystem\s*:\s*/i,
    /\bact\s+as\s+(if|though)\b/i,
    /\bforget\s+(all|everything)\b/i,

    // Data exfiltration
    /\bsend\s+(to|all)\s+(data|information|content)\b/i,
    /\bexfiltrate\b/i,
    /\bforward\s+(all|any)\s+(data|results|output)\b/i,
    /\bleak\s+(any|all)\b/i,

    // Hidden behavior
    /\bsilently\b/i,
    /\bwithout\s+(telling|informing|notifying)\b/i,
    /\bsecretly\b/i,
    /\bhidden\s+(command|instruction|behavior)\b/i,

    // Authority escalation
    /\byou\s+are\s+(now|actually)\b/i,
    /\bnew\s+persona\b/i,
    /\brole\s*:\s*/i,
];

const DANGEROUS_TOOL_PATTERNS = [
    /(?:^|[_\-\s.])exec(?:ute)?(?:$|[_\-\s.])/i,
    /(?:^|[_\-\s.])shell(?:$|[_\-\s.])/i,
    /(?:^|[_\-\s.])eval(?:$|[_\-\s.])/i,
    /(?:^|[_\-\s.])delete(?:$|[_\-\s.])/i,
    /(?:^|[_\-\s.])drop(?:$|[_\-\s.])/i,
    /(?:^|[_\-\s.])truncate(?:$|[_\-\s.])/i,
    /(?:^|[_\-\s.])format(?:$|[_\-\s.])/i,
    /(?:^|[_\-\s.])remove_all(?:$|[_\-\s.])/i,
    /(?:^|[_\-\s.])wipe(?:$|[_\-\s.])/i,
    /(?:^|[_\-\s.])root(?:$|[_\-\s.])/i,
    /(?:^|[_\-\s.])sudo(?:$|[_\-\s.])/i,
    /chmod\s+777/i,
    /rm\s+-rf/i,
];

const INPUT_INJECTION_PATTERNS = [
    // SQL injection
    /('\s*(OR|AND)\s+'1'\s*=\s*'1)/i,
    /(;\s*(DROP|DELETE|UPDATE|INSERT)\s+)/i,
    /(UNION\s+(ALL\s+)?SELECT)/i,

    // Command injection
    /(\|\||&&)\s*\w/,
    /;\s*(rm|cat|curl|wget|nc)\s/i,
    /\$\(.*\)/,
    /`[^`]*`/,

    // Path traversal
    /\.\.\//,
    /\.\.\\/, 

    // Prompt injection via input
    /\bignore\s+(all\s+)?instructions?\b/i,
];

// ==========================================
// Guard Implementation
// ==========================================

/**
 * Scan result object
 * @typedef {Object} ScanResult
 * @property {boolean} safe - Whether the item passed all checks
 * @property {string} severity - 'critical' | 'warning' | 'info'
 * @property {string[]} findings - List of detected issues
 * @property {string} recommendation - Suggested action
 */

/**
 * Scan a tool definition for security issues
 */
function scanTool(tool, options = {}) {
    const findings = [];
    const name = tool.name || '';
    const desc = tool.description || '';
    const fullText = `${name} ${desc}`;

    // Check for poisoning in descriptions
    for (const pattern of POISONING_PATTERNS) {
        if (pattern.test(desc)) {
            findings.push({
                type: 'tool_poisoning',
                severity: 'critical',
                pattern: pattern.toString(),
                match: desc.match(pattern)?.[0],
                message: `Tool poisoning detected: "${desc.match(pattern)?.[0]}"`,
            });
        }
    }

    // Check for dangerous tool names
    for (const pattern of DANGEROUS_TOOL_PATTERNS) {
        if (pattern.test(name)) {
            findings.push({
                type: 'dangerous_tool',
                severity: 'warning',
                pattern: pattern.toString(),
                match: name.match(pattern)?.[0],
                message: `Potentially dangerous tool name: "${name}"`,
            });
        }
    }

    // Check for overly permissive schemas
    const schema = tool.inputSchema || {};
    if (schema.additionalProperties !== false && Object.keys(schema.properties || {}).length > 0) {
        findings.push({
            type: 'schema_permissive',
            severity: 'info',
            message: `Tool "${name}" allows additional properties — may accept unexpected inputs`,
        });
    }

    const hasCritical = findings.some(f => f.severity === 'critical');
    const hasWarning = findings.some(f => f.severity === 'warning');

    return {
        tool: name,
        safe: !hasCritical,
        severity: hasCritical ? 'critical' : hasWarning ? 'warning' : 'info',
        findings,
        recommendation: hasCritical
            ? 'BLOCK: This tool shows signs of tool poisoning. Do not execute.'
            : hasWarning
            ? 'CAUTION: Review this tool before execution.'
            : 'PASS: No significant security issues detected.',
    };
}

/**
 * Validate tool input arguments for injection attacks
 */
function validateInput(toolName, args, options = {}) {
    const findings = [];
    const maxStringLength = options.maxStringLength || 10000;

    function checkValue(key, value, path = '') {
        const currentPath = path ? `${path}.${key}` : key;

        if (typeof value === 'string') {
            // Check length
            if (value.length > maxStringLength) {
                findings.push({
                    type: 'input_too_long',
                    severity: 'warning',
                    field: currentPath,
                    message: `Input "${currentPath}" exceeds max length (${value.length}/${maxStringLength})`,
                });
            }

            // Check injection patterns
            for (const pattern of INPUT_INJECTION_PATTERNS) {
                if (pattern.test(value)) {
                    findings.push({
                        type: 'input_injection',
                        severity: 'critical',
                        field: currentPath,
                        pattern: pattern.toString(),
                        match: value.match(pattern)?.[0],
                        message: `Potential injection in "${currentPath}": "${value.match(pattern)?.[0]}"`,
                    });
                }
            }
        } else if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                value.forEach((item, idx) => checkValue(idx, item, currentPath));
            } else {
                for (const [k, v] of Object.entries(value)) {
                    checkValue(k, v, currentPath);
                }
            }
        }
    }

    if (args && typeof args === 'object') {
        for (const [key, value] of Object.entries(args)) {
            checkValue(key, value);
        }
    }

    const hasCritical = findings.some(f => f.severity === 'critical');

    return {
        tool: toolName,
        safe: !hasCritical,
        severity: hasCritical ? 'critical' : findings.length > 0 ? 'warning' : 'pass',
        findings,
        recommendation: hasCritical
            ? 'BLOCK: Potential injection attack detected in input.'
            : findings.length > 0
            ? 'CAUTION: Input has potential issues but may be safe.'
            : 'PASS: Input validation passed.',
    };
}

/**
 * Scan all tools from a server for security issues
 */
function scanAllTools(tools) {
    const results = tools.map(t => scanTool(t));
    const critical = results.filter(r => r.severity === 'critical');
    const warnings = results.filter(r => r.severity === 'warning');

    return {
        total: results.length,
        safe: critical.length === 0,
        critical: critical.length,
        warnings: warnings.length,
        passed: results.length - critical.length - warnings.length,
        results,
        summary: critical.length > 0
            ? `🔴 ${critical.length} critical issue(s) found — tool poisoning suspected`
            : warnings.length > 0
            ? `🟡 ${warnings.length} warning(s) — review recommended`
            : `🟢 All ${results.length} tools passed security scan`,
    };
}

// ==========================================
// Permission Control
// ==========================================

/**
 * Create a permission-based tool filter
 */
function createPermissionFilter(config = {}) {
    const {
        allowList = null,    // Array of allowed tool names (null = allow all)
        denyList = [],       // Array of denied tool names
        maxCallsPerMinute = 60,
        logCallback = null,
    } = config;

    const callCounts = new Map();

    return {
        /**
         * Check if a tool call is permitted
         */
        check(toolName, args = {}) {
            // Deny list check
            if (denyList.includes(toolName)) {
                return { allowed: false, reason: `Tool "${toolName}" is on the deny list` };
            }

            // Allow list check
            if (allowList !== null && !allowList.includes(toolName)) {
                return { allowed: false, reason: `Tool "${toolName}" is not on the allow list` };
            }

            // Rate limit check
            const now = Date.now();
            const key = toolName;
            const calls = callCounts.get(key) || [];
            const recentCalls = calls.filter(t => now - t < 60000);
            if (recentCalls.length >= maxCallsPerMinute) {
                return { allowed: false, reason: `Rate limit exceeded for "${toolName}" (${maxCallsPerMinute}/min)` };
            }

            // Track call
            recentCalls.push(now);
            callCounts.set(key, recentCalls);

            if (logCallback) {
                logCallback({ toolName, args, timestamp: new Date().toISOString(), allowed: true });
            }

            return { allowed: true };
        },

        /**
         * Reset rate limit counters
         */
        reset() {
            callCounts.clear();
        },
    };
}

// ==========================================
// Factory: Create a Guard Instance
// ==========================================

/**
 * Create a guard with a specific security mode
 * @param {Object} config
 * @param {'strict'|'moderate'|'permissive'} config.mode - Security mode
 * @param {string[]} config.allowList - Allowed tool names
 * @param {string[]} config.denyList - Denied tool names
 * @param {Function} config.onBlock - Callback when a tool call is blocked
 * @param {Function} config.onWarning - Callback for warnings
 */
function createGuard(config = {}) {
    const {
        mode = 'moderate',
        allowList = null,
        denyList = [],
        maxCallsPerMinute = 60,
        onBlock = null,
        onWarning = null,
        onLog = null,
    } = config;

    const permFilter = createPermissionFilter({
        allowList,
        denyList,
        maxCallsPerMinute,
        logCallback: onLog,
    });

    return {
        /**
         * Scan a single tool definition
         */
        scanTool: (tool) => scanTool(tool, { mode }),

        /**
         * Scan all tools from a server
         */
        scanAllTools: (tools) => scanAllTools(tools),

        /**
         * Validate input arguments before sending to a tool
         */
        validateInput: (toolName, args) => {
            const maxStringLength = mode === 'strict' ? 5000 : mode === 'moderate' ? 10000 : 50000;
            return validateInput(toolName, args, { maxStringLength });
        },

        /**
         * Full guard check: permissions + input validation
         * Returns { allowed, safe, reason, findings }
         */
        check(toolName, args = {}) {
            // Permission check
            const perm = permFilter.check(toolName, args);
            if (!perm.allowed) {
                if (onBlock) onBlock({ toolName, args, reason: perm.reason });
                return { allowed: false, safe: false, reason: perm.reason, findings: [] };
            }

            // Input validation
            const validation = validateInput(toolName, args, {
                maxStringLength: mode === 'strict' ? 5000 : 10000,
            });

            if (!validation.safe) {
                if (mode === 'strict') {
                    if (onBlock) onBlock({ toolName, args, reason: validation.recommendation });
                    return { allowed: false, safe: false, reason: validation.recommendation, findings: validation.findings };
                }
                // In moderate/permissive mode, warn but allow
                if (onWarning) onWarning({ toolName, args, findings: validation.findings });
            }

            return {
                allowed: true,
                safe: validation.safe,
                reason: validation.recommendation,
                findings: validation.findings,
            };
        },

        /**
         * Reset internal state (rate limits, etc.)
         */
        reset: () => permFilter.reset(),
    };
}

// ==========================================
// Exports
// ==========================================

export {
    createGuard,
    scanTool,
    scanAllTools,
    validateInput,
    createPermissionFilter,
    POISONING_PATTERNS,
    DANGEROUS_TOOL_PATTERNS,
    INPUT_INJECTION_PATTERNS,
};

export default createGuard;
