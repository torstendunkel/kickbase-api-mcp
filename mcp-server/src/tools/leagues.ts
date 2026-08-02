import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiGet } from '../client.js';
import { registerApiTool } from '../format.js';
import { leagueId, paginationMax, paginationStart } from '../schemas.js';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

export function registerLeagueTools(server: McpServer): void {
  registerApiTool(
    server,
    'kickbase_list_leagues',
    {
      title: 'List Leagues',
      description: 'List all fantasy leagues the authenticated user belongs to.',
      inputSchema: {},
      annotations: READ_ONLY,
    },
    () => apiGet('/v4/leagues')
  );

  registerApiTool(
    server,
    'kickbase_get_league_overview',
    {
      title: 'Get League Overview',
      description: 'Get overview information for a specific league (name, image, settings, etc.).',
      inputSchema: { leagueId },
      annotations: READ_ONLY,
    },
    ({ leagueId }) => apiGet(`/v4/leagues/${leagueId}/overview`)
  );

  registerApiTool(
    server,
    'kickbase_get_league_ranking',
    {
      title: 'Get League Ranking',
      description: 'Get the current standings/ranking of all managers in a league.',
      inputSchema: { leagueId },
      annotations: READ_ONLY,
    },
    ({ leagueId }) => apiGet(`/v4/leagues/${leagueId}/ranking`)
  );

  registerApiTool(
    server,
    'kickbase_get_my_squad',
    {
      title: 'Get My Squad',
      description: 'Get your squad (owned players) in a specific league.',
      inputSchema: { leagueId },
      annotations: READ_ONLY,
    },
    ({ leagueId }) => apiGet(`/v4/leagues/${leagueId}/squad`)
  );

  registerApiTool(
    server,
    'kickbase_get_my_budget',
    {
      title: 'Get My Budget',
      description: 'Get your remaining budget in a specific league.',
      inputSchema: { leagueId },
      annotations: READ_ONLY,
    },
    ({ leagueId }) => apiGet(`/v4/leagues/${leagueId}/me/budget`)
  );

  registerApiTool(
    server,
    'kickbase_get_my_league_info',
    {
      title: 'Get My League Info',
      description: 'Get your personal stats and info within a league (points, value, rank, etc.).',
      inputSchema: { leagueId },
      annotations: READ_ONLY,
    },
    ({ leagueId }) => apiGet(`/v4/leagues/${leagueId}/me`)
  );

  registerApiTool(
    server,
    'kickbase_get_activities_feed',
    {
      title: 'Get Activities Feed',
      description: 'Get the activity feed for a league (transfers, comments, events).',
      inputSchema: { leagueId, start: paginationStart, max: paginationMax },
      annotations: READ_ONLY,
    },
    ({ leagueId, start, max }) =>
      apiGet(`/v4/leagues/${leagueId}/activitiesFeed`, { start, max })
  );
}
