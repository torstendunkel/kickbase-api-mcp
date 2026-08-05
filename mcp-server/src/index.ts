#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getToken } from './auth.js';
import { registerBaseTools } from './tools/base.js';
import { registerCompetitionTools } from './tools/competitions.js';
import { registerLeagueTools } from './tools/leagues.js';
import { registerLineupTools } from './tools/lineup.js';
import { registerManagerTools } from './tools/managers.js';
import { registerMarketTools } from './tools/market.js';
import { registerPlayerTools } from './tools/players.js';
import { registerScoutedPlayerTools } from './tools/scouted-players.js';
import { registerUserTools } from './tools/user.js';

const server = new McpServer({ name: 'kickbase-mcp-server', version: '1.0.0' });

registerUserTools(server);
registerLeagueTools(server);
registerLineupTools(server);
registerMarketTools(server);
registerPlayerTools(server);
registerScoutedPlayerTools(server);
registerManagerTools(server);
registerCompetitionTools(server);
registerBaseTools(server);

// Fire-and-forget: fetch the auth token in parallel with the stdio handshake so
// the first real tool call doesn't pay the ~150-200ms login cost. Errors are
// swallowed here and surface normally on the first actual API call.
void getToken().catch(() => {});

const transport = new StdioServerTransport();
await server.connect(transport);
