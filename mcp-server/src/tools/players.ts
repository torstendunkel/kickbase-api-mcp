import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet } from '../client.js';
import { registerApiTool } from '../format.js';
import { leagueId, playerId } from '../schemas.js';

const marketValueTimeframe = z.enum(['7', '30', '90', '365']).describe('Timeframe in days (7, 30, 90, or 365)');

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
      inputSchema: { leagueId, playerId, timeframe: marketValueTimeframe },
      annotations: READ_ONLY,
    },
    ({ leagueId, playerId, timeframe }) =>
      apiGet(`/v4/leagues/${leagueId}/players/${playerId}/marketValue/${timeframe}`)
  );

  registerApiTool(
    server,
    'kickbase_get_market_value_bulk',
    {
      title: 'Get Market Value (Bulk)',
      description:
        'Get the market-value trend for multiple players in one call, e.g. every player currently ' +
        'listed on the transfer market or your whole squad. Fires the underlying requests in parallel ' +
        'server-side instead of one-by-one, which is far faster than calling kickbase_get_player_market_value ' +
        "per player — a 70-player scan drops from ~5s sequential to well under 1s. Results for players " +
        "that fail individually (e.g. a bad ID) are reported inline as an 'error' on that entry rather " +
        'than failing the whole batch.',
      inputSchema: {
        leagueId,
        playerIds: z
          .array(playerId)
          .min(1)
          .max(100)
          .describe('Player IDs to fetch market-value trends for (max 100 per call)'),
        timeframe: marketValueTimeframe,
      },
      annotations: READ_ONLY,
    },
    async ({ leagueId, playerIds, timeframe }) => {
      const settled = await Promise.allSettled(
        playerIds.map((playerId) => apiGet(`/v4/leagues/${leagueId}/players/${playerId}/marketValue/${timeframe}`))
      );
      return {
        results: settled.map((outcome, i) =>
          outcome.status === 'fulfilled'
            ? { playerId: playerIds[i], data: outcome.value }
            : {
                playerId: playerIds[i],
                error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
              }
        ),
      };
    }
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
