import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiGet } from '../client.js';
import { registerApiTool } from '../format.js';
import { leagueId, managerId } from '../schemas.js';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

export function registerManagerTools(server: McpServer): void {
  registerApiTool(
    server,
    'kickbase_get_manager_squad',
    {
      title: 'Get Manager Squad',
      description: 'Get the squad of another manager in your league.',
      inputSchema: { leagueId, managerId },
      annotations: READ_ONLY,
    },
    ({ leagueId, managerId }) => apiGet(`/v4/leagues/${leagueId}/managers/${managerId}/squad`)
  );

  registerApiTool(
    server,
    'kickbase_get_manager_performance',
    {
      title: 'Get Manager Performance',
      description: "Get a manager's point history and performance over the season.",
      inputSchema: { leagueId, managerId },
      annotations: READ_ONLY,
    },
    ({ leagueId, managerId }) => apiGet(`/v4/leagues/${leagueId}/managers/${managerId}/performance`)
  );
}
