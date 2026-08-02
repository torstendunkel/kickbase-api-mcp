import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet, apiPost } from '../client.js';
import { registerApiTool } from '../format.js';
import { leagueId } from '../schemas.js';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
const MUTATE = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true };

export function registerLineupTools(server: McpServer): void {
  registerApiTool(
    server,
    'kickbase_get_lineup',
    {
      title: 'Get Lineup',
      description: 'Get your current lineup for the ongoing matchday in a league.',
      inputSchema: { leagueId },
      annotations: READ_ONLY,
    },
    ({ leagueId }) => apiGet(`/v4/leagues/${leagueId}/lineup`)
  );

  registerApiTool(
    server,
    'kickbase_get_lineup_overview',
    {
      title: 'Get Lineup Overview',
      description: 'Get an overview of your lineup including live points for the current matchday.',
      inputSchema: { leagueId },
      annotations: READ_ONLY,
    },
    ({ leagueId }) => apiGet(`/v4/leagues/${leagueId}/lineup/overview`)
  );

  registerApiTool(
    server,
    'kickbase_get_lineup_selection',
    {
      title: 'Get Lineup Selection',
      description: 'Get available players that can be placed in your lineup.',
      inputSchema: { leagueId },
      annotations: READ_ONLY,
    },
    ({ leagueId }) => apiGet(`/v4/leagues/${leagueId}/lineup/selection`)
  );

  registerApiTool(
    server,
    'kickbase_fill_lineup',
    {
      title: 'Fill Lineup',
      description: 'Set your lineup formation and player selection for the current matchday.',
      inputSchema: {
        leagueId,
        formation: z.string().min(1).describe('Formation string, e.g. "4-4-2", "4-3-3"'),
        playerIds: z
          .array(z.string().min(1))
          .min(1)
          .describe('Ordered list of player IDs to place in the lineup'),
      },
      annotations: MUTATE,
    },
    ({ leagueId, formation, playerIds }) =>
      apiPost(`/v4/leagues/${leagueId}/lineup/fill`, { lud: formation, pls: playerIds })
  );
}
