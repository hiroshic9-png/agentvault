#!/usr/bin/env node

/**
 * AgentVault Gateway — CLI
 * 
 * Usage:
 *   npx agentvault-gateway --target "npx -y @modelcontextprotocol/server-github"
 *   npx agentvault-gateway --config ./agentvault.config.json
 */

import { AgentVaultGateway } from './index.js';
import { readFileSync, existsSync } from 'fs';

function parseArgs(args) {
  const config = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--target':
      case '-t':
        config.target = args[++i];
        break;
      case '--config':
      case '-c':
        const configPath = args[++i];
        if (existsSync(configPath)) {
          Object.assign(config, JSON.parse(readFileSync(configPath, 'utf-8')));
        } else {
          console.error(`Config file not found: ${configPath}`);
          process.exit(1);
        }
        break;
      case '--no-telemetry':
        config.telemetry = { enabled: false };
        break;
      case '--no-security':
        config.security = { enabled: false };
        break;
      case '--log-dir':
        config.telemetry = { ...(config.telemetry || {}), logDir: args[++i] };
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      case '--version':
      case '-v':
        console.log('agentvault-gateway v0.1.0');
        process.exit(0);
        break;
    }
  }
  
  return config;
}

function printHelp() {
  console.log(`
🏴‍☠️ AgentVault Gateway — MCP Proxy with audit logging

Usage:
  npx agentvault-gateway --target <command>

Options:
  -t, --target <cmd>    Target MCP server command to proxy
  -c, --config <path>   Path to config file (JSON)
  --no-telemetry        Disable telemetry data collection
  --no-security         Disable security filtering
  --log-dir <path>      Directory for log files (default: ./agentvault-logs)
  -h, --help            Show this help
  -v, --version         Show version

Examples:
  npx agentvault-gateway --target "npx -y @modelcontextprotocol/server-github"
  npx agentvault-gateway --target "npx -y @modelcontextprotocol/server-filesystem /tmp"
  npx agentvault-gateway --config ./agentvault.config.json --no-telemetry
`);
}

// メイン実行
const config = parseArgs(process.argv.slice(2));

if (!config.target) {
  console.error('Error: --target is required. Use --help for usage.');
  process.exit(1);
}

const gateway = new AgentVaultGateway(config);

// グレースフルシャットダウン
process.on('SIGINT', async () => {
  console.error('\n🏴‍☠️ Shutting down AgentVault Gateway...');
  await gateway.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await gateway.shutdown();
  process.exit(0);
});

gateway.start().catch(err => {
  console.error('Failed to start gateway:', err);
  process.exit(1);
});
