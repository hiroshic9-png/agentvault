#!/usr/bin/env node
/**
 * AgentVault Tools — CLI Entry Point
 */
import { AgentVaultTools } from './index.js';

const server = new AgentVaultTools();
server.start().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
