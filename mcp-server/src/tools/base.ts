import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiGet } from '../client.js';
import { registerApiTool } from '../format.js';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

export function registerBaseTools(server: McpServer): void {
  registerApiTool(
    server,
    'kickbase_get_base_overview',
    {
      title: 'Get Base Overview',
      description: 'Get the base overview including live match information and current matchday status.',
      inputSchema: {},
      annotations: READ_ONLY,
    },
    () => apiGet('/v4/base/overview')
  );

  registerApiTool(
    server,
    'kickbase_get_stage',
    {
      title: 'Get Stage',
      description: 'Get the current stage/matchday information including active competitions.',
      inputSchema: {},
      annotations: READ_ONLY,
    },
    () => apiGet('/v4/base/stage')
  );
}
