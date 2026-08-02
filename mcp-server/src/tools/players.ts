import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet } from '../client.js';
import { registerApiTool } from '../format.js';
import { leagueId, playerId } from '../schemas.js';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

export function registerPlayerTools(server: McpServer): void {
  registerApiTool(
    server,
    'kickbase_get_league_player',
    {
      title: 'Get League Player',
      description: 'Get detailed information about a specific player within a league context.',
      inputSchema: { leagueId, playerId },
      annotations: READ_ONLY,
    },
    ({ leagueId, playerId }) => apiGet(`/v4/leagues/${leagueId}/players/${playerId}`)
  );

  registerApiTool(
    server,
    'kickbase_get_player_market_value',
    {
      title: 'Get Player Market Value',
      description: 'Get the market value history for a player over a given timeframe.',
      inputSchema: {
        leagueId,
        playerId,
        timeframe: z.enum(['7', '30', '90', '365']).describe('Timeframe in days (7, 30, 90, or 365)'),
      },
      annotations: READ_ONLY,
    },
    ({ leagueId, playerId, timeframe }) =>
      apiGet(`/v4/leagues/${leagueId}/players/${playerId}/marketValue/${timeframe}`)
  );

  registerApiTool(
    server,
    'kickbase_get_player_performance',
    {
      title: 'Get Player Performance',
      description: 'Get matchday-by-matchday performance and points for a player in a league.',
      inputSchema: { leagueId, playerId },
      annotations: READ_ONLY,
    },
    ({ leagueId, playerId }) => apiGet(`/v4/leagues/${leagueId}/players/${playerId}/performance`)
  );

  registerApiTool(
    server,
    'kickbase_get_player_transfer_history',
    {
      title: 'Get Player Transfer History',
      description: 'Get the transfer history of a player within a league.',
      inputSchema: { leagueId, playerId },
      annotations: READ_ONLY,
    },
    ({ leagueId, playerId }) => apiGet(`/v4/leagues/${leagueId}/players/${playerId}/transferHistory`)
  );
}
