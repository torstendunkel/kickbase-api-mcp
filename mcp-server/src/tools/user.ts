import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiGet } from '../client.js';
import { registerApiTool } from '../format.js';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

export function registerUserTools(server: McpServer): void {
  registerApiTool(
    server,
    'kickbase_get_profile',
    {
      title: 'Get Profile',
      description: "Get the authenticated user's Kickbase profile and account information.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    () => apiGet('/v4/user/me')
  );
}
