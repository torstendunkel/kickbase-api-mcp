import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiDelete, apiGet, apiPost } from '../client.js';
import { registerApiTool } from '../format.js';
import { leagueId, playerId } from '../schemas.js';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

export function registerScoutedPlayerTools(server: McpServer): void {
  registerApiTool(
    server,
    'kickbase_get_scouted_players',
    {
      title: 'Get Scouted Players',
      description: "Get your watchlist of scouted players in a league.",
      inputSchema: { leagueId },
      annotations: READ_ONLY,
    },
    ({ leagueId }) => apiGet(`/v4/leagues/${leagueId}/scoutedplayers`)
  );

  registerApiTool(
    server,
    'kickbase_add_scouted_player',
    {
      title: 'Add Scouted Player',
      description: 'Add a player to your watchlist of scouted players in a league.',
      inputSchema: { leagueId, playerId: playerId.describe('Player ID to add to the watchlist') },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    ({ leagueId, playerId }) => apiPost(`/v4/leagues/${leagueId}/scoutedplayers/${playerId}`)
  );

  registerApiTool(
    server,
    'kickbase_remove_scouted_player',
    {
      title: 'Remove Scouted Player',
      description: 'Remove a single player from your watchlist of scouted players in a league.',
      inputSchema: { leagueId, playerId: playerId.describe('Player ID to remove from the watchlist') },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    ({ leagueId, playerId }) => apiDelete(`/v4/leagues/${leagueId}/scoutedplayers/${playerId}`)
  );

  registerApiTool(
    server,
    'kickbase_clear_scouted_players',
    {
      title: 'Clear Scouted Players',
      description:
        'Clear your entire watchlist of scouted players in a league in one call. ' +
        'Use kickbase_remove_scouted_player instead to remove a single player.',
      inputSchema: { leagueId },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    ({ leagueId }) => apiDelete(`/v4/leagues/${leagueId}/scoutedplayers`)
  );
}
