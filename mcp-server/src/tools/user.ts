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

  registerApiTool(
    server,
    'kickbase_collect_bonus',
    {
      title: 'Collect Daily Bonus',
      description:
        'Claim the authenticated user\'s pending daily bonus reward. Despite being a GET ' +
        'endpoint, this mutates state (marks the bonus as collected) — calling it again ' +
        'after collection is expected to error or no-op if no bonus is currently pending.',
      inputSchema: {},
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    () => apiGet('/v4/bonus/collect')
  );
}
