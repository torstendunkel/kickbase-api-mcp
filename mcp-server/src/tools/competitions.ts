import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet } from '../client.js';
import { registerApiTool } from '../format.js';
import { competitionId, playerId } from '../schemas.js';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

interface MatchdaysResponse {
  it?: { day?: number }[];
  day?: number;
}

export function selectMatchday<T extends MatchdaysResponse>(data: T, day: string | undefined): T {
  if (day === undefined || day === '' || !Array.isArray(data.it)) return data;

  const wanted = day === 'current' ? data.day : Number(day);
  if (wanted === undefined || Number.isNaN(wanted)) return data;

  return { ...data, it: data.it.filter((entry) => entry.day === wanted) };
}

export function registerCompetitionTools(server: McpServer): void {
  registerApiTool(
    server,
    'kickbase_list_competitions',
    {
      title: 'List Competitions',
      description: 'List all available football competitions (e.g. Bundesliga, Premier League).',
      inputSchema: {},
      annotations: READ_ONLY,
    },
    () => apiGet('/v4/competitions')
  );

  registerApiTool(
    server,
    'kickbase_search_players',
    {
      title: 'Search Players',
      description:
        'Search for players by name within a single competition. Both competitionId and query ' +
        'are required — this endpoint is always scoped to one competition, there is no ' +
        "cross-competition search. If you don't know the competition ID, call " +
        "kickbase_list_competitions first (Bundesliga is typically '1').",
      inputSchema: { competitionId, query: z.string().min(1).describe('Player name search query') },
      annotations: READ_ONLY,
    },
    ({ competitionId, query }) =>
      apiGet(`/v4/competitions/${competitionId}/players/search`, { query })
  );

  registerApiTool(
    server,
    'kickbase_get_competition_players',
    {
      title: 'Get Competition Players',
      description:
        'Get the top players in a competition by points, optionally filtered to a single position. ' +
        "This is a top-25 leaderboard, not the full roster — the API hard-caps results at 25 and " +
        'always sorts by points descending; there is no working pagination for this endpoint. ' +
        'Filtering by position returns every player at that position if there are 25 or fewer ' +
        "(e.g. all goalkeepers), otherwise still just the top 25. Use kickbase_search_players " +
        'instead if you need a specific player who might not be a top performer.',
      inputSchema: {
        competitionId,
        position: z
          .enum(['1', '2', '3', '4'])
          .optional()
          .describe('Filter by position: 1=goalkeeper, 2=defender, 3=midfielder, 4=forward. Omit for all positions.'),
      },
      annotations: READ_ONLY,
    },
    ({ competitionId, position }) =>
      apiGet(`/v4/competitions/${competitionId}/players`, { position })
  );

  registerApiTool(
    server,
    'kickbase_get_competition_player',
    {
      title: 'Get Competition Player',
      description: 'Get detailed information about a specific player in a competition.',
      inputSchema: { competitionId, playerId },
      annotations: READ_ONLY,
    },
    ({ competitionId, playerId }) => apiGet(`/v4/competitions/${competitionId}/players/${playerId}`)
  );

  registerApiTool(
    server,
    'kickbase_get_competition_table',
    {
      title: 'Get Competition Table',
      description: 'Get the current league table / standings for a football competition.',
      inputSchema: { competitionId },
      annotations: READ_ONLY,
    },
    ({ competitionId }) => apiGet(`/v4/competitions/${competitionId}/table`)
  );

  registerApiTool(
    server,
    'kickbase_get_matchdays',
    {
      title: 'Get Matchdays',
      description:
        'Get matchdays for a competition including fixtures, dates and status. ' +
        'This returns all 34 matchdays and is by far the largest response of any tool — ' +
        "always pass 'day' unless you genuinely need the full season.",
      inputSchema: {
        competitionId,
        day: z
          .string()
          .optional()
          .describe(
            "Return only this matchday (e.g. '5'), or 'current' for the ongoing one. " +
              'Omit to return the entire season.'
          ),
      },
      annotations: READ_ONLY,
    },
    async ({ competitionId, day }) => {
      const data = (await apiGet(`/v4/competitions/${competitionId}/matchdays`)) as MatchdaysResponse;
      return selectMatchday(data, day);
    }
  );
}
