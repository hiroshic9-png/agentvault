#!/usr/bin/env node
import { AgentVaultMemory } from './index.js';
const server = new AgentVaultMemory();
server.start().catch(err => { console.error('Fatal:', err); process.exit(1); });
