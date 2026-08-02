#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { apiDelete, apiGet, apiPost } from './client.js';

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS: Tool[] = [
  // --- User ---
  {
    name: 'kickbase_get_profile',
    description: "Get the authenticated user's Kickbase profile and account information.",
    inputSchema: { type: 'object', properties: {}, required: [] },
  },

  // --- Leagues ---
  {
    name: 'kickbase_list_leagues',
    description: "List all fantasy leagues the authenticated user belongs to.",
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'kickbase_get_league_overview',
    description: 'Get overview information for a specific league (name, image, settings, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
      },
      required: ['leagueId'],
    },
  },
  {
    name: 'kickbase_get_league_ranking',
    description: "Get the current standings/ranking of all managers in a league.",
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
      },
      required: ['leagueId'],
    },
  },
  {
    name: 'kickbase_get_my_squad',
    description: "Get your squad (owned players) in a specific league.",
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
      },
      required: ['leagueId'],
    },
  },
  {
    name: 'kickbase_get_my_budget',
    description: "Get your remaining budget in a specific league.",
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
      },
      required: ['leagueId'],
    },
  },
  {
    name: 'kickbase_get_my_league_info',
    description: "Get your personal stats and info within a league (points, value, rank, etc.).",
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
      },
      required: ['leagueId'],
    },
  },
  {
    name: 'kickbase_get_activities_feed',
    description: "Get the activity feed for a league (transfers, comments, events).",
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
        start: { type: 'string', description: 'Pagination start offset' },
        max: { type: 'string', description: 'Max number of items to return' },
      },
      required: ['leagueId'],
    },
  },

  // --- Lineup ---
  {
    name: 'kickbase_get_lineup',
    description: "Get your current lineup for the ongoing matchday in a league.",
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
      },
      required: ['leagueId'],
    },
  },
  {
    name: 'kickbase_get_lineup_overview',
    description: "Get an overview of your lineup including live points for the current matchday.",
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
      },
      required: ['leagueId'],
    },
  },
  {
    name: 'kickbase_get_lineup_selection',
    description: "Get available players that can be placed in your lineup.",
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
      },
      required: ['leagueId'],
    },
  },
  {
    name: 'kickbase_fill_lineup',
    description: "Set your lineup formation and player selection for the current matchday.",
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
        formation: {
          type: 'string',
          description: 'Formation string, e.g. "4-4-2", "4-3-3"',
        },
        playerIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ordered list of player IDs to place in the lineup',
        },
      },
      required: ['leagueId', 'formation', 'playerIds'],
    },
  },

  // --- Transfer Market ---
  {
    name: 'kickbase_get_market',
    description: "Get all players currently listed on the transfer market in a league.",
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
      },
      required: ['leagueId'],
    },
  },
  {
    name: 'kickbase_sell_player',
    description: "List one of your players on the transfer market for sale.",
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
        playerId: { type: 'string', description: 'Player ID to list for sale' },
      },
      required: ['leagueId', 'playerId'],
    },
  },
  {
    name: 'kickbase_remove_from_market',
    description: "Remove one of your players from the transfer market.",
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
        playerId: { type: 'string', description: 'Player ID to remove from market' },
      },
      required: ['leagueId', 'playerId'],
    },
  },
  {
    name: 'kickbase_list_player_offers',
    description:
      "Get open transfer-market offers for a player plus their current market status. " +
      "Returns 'ofs' (array of open bids, each with bidder 'u'/'uoid', name 'unm', and bid amount 'uop'), " +
      "'iotm' (player is on the transfer market), 'iposl' (player is on your sell list), " +
      "'mv' (market value), and 'prc' (listed price). " +
      "IMPORTANT: Kickbase removed visibility into other managers' incoming bids on players you don't own. " +
      "'ofs' is therefore populated mainly for (a) your own bids on someone else's listing, or " +
      "(b) bids others have placed on YOUR listed player. It will usually be empty otherwise — that is expected, not an error.",
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
        playerId: { type: 'string', description: 'Player ID' },
      },
      required: ['leagueId', 'playerId'],
    },
  },
  {
    name: 'kickbase_place_offer',
    description: "Place a bid/offer on a player listed on the transfer market.",
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
        playerId: { type: 'string', description: 'Player ID to bid on' },
        price: { type: 'number', description: 'Offer price in Kickbase currency units' },
      },
      required: ['leagueId', 'playerId', 'price'],
    },
  },
  {
    name: 'kickbase_accept_offer',
    description:
      "Accept an offer on one of your players listed on the market. " +
      "Note: 'offerId' has been observed to be identical to the bidding user's ID " +
      "('u'/'uoid' in the offers list from kickbase_list_player_offers or kickbase_get_market), " +
      "not a separate offer identifier — pass that value here.",
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
        playerId: { type: 'string', description: 'Player ID' },
        offerId: { type: 'string', description: 'Offer ID to accept (observed to equal the bidder\'s user ID)' },
      },
      required: ['leagueId', 'playerId', 'offerId'],
    },
  },
  {
    name: 'kickbase_decline_offer',
    description:
      "Decline an offer on one of your players listed on the market. " +
      "Note: 'offerId' has been observed to be identical to the bidding user's ID " +
      "('u'/'uoid' in the offers list from kickbase_list_player_offers or kickbase_get_market), " +
      "not a separate offer identifier — pass that value here.",
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
        playerId: { type: 'string', description: 'Player ID' },
        offerId: { type: 'string', description: 'Offer ID to decline (observed to equal the bidder\'s user ID)' },
      },
      required: ['leagueId', 'playerId', 'offerId'],
    },
  },

  // --- Players (league context) ---
  {
    name: 'kickbase_get_league_player',
    description: "Get detailed information about a specific player within a league context.",
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
        playerId: { type: 'string', description: 'Player ID' },
      },
      required: ['leagueId', 'playerId'],
    },
  },
  {
    name: 'kickbase_get_player_market_value',
    description: "Get the market value history for a player over a given timeframe.",
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
        playerId: { type: 'string', description: 'Player ID' },
        timeframe: {
          type: 'string',
          enum: ['7', '30', '90', '365'],
          description: 'Timeframe in days (7, 30, 90, or 365)',
        },
      },
      required: ['leagueId', 'playerId', 'timeframe'],
    },
  },
  {
    name: 'kickbase_get_player_performance',
    description: "Get matchday-by-matchday performance and points for a player in a league.",
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
        playerId: { type: 'string', description: 'Player ID' },
      },
      required: ['leagueId', 'playerId'],
    },
  },
  {
    name: 'kickbase_get_player_transfer_history',
    description: "Get the transfer history of a player within a league.",
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
        playerId: { type: 'string', description: 'Player ID' },
      },
      required: ['leagueId', 'playerId'],
    },
  },

  // --- Managers ---
  {
    name: 'kickbase_get_manager_squad',
    description: "Get the squad of another manager in your league.",
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
        managerId: { type: 'string', description: 'Manager (user) ID' },
      },
      required: ['leagueId', 'managerId'],
    },
  },
  {
    name: 'kickbase_get_manager_performance',
    description: "Get a manager's point history and performance over the season.",
    inputSchema: {
      type: 'object',
      properties: {
        leagueId: { type: 'string', description: 'League ID' },
        managerId: { type: 'string', description: 'Manager (user) ID' },
      },
      required: ['leagueId', 'managerId'],
    },
  },

  // --- Competitions ---
  {
    name: 'kickbase_list_competitions',
    description: "List all available football competitions (e.g. Bundesliga, Premier League).",
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'kickbase_search_players',
    description: "Search for players by name within a competition.",
    inputSchema: {
      type: 'object',
      properties: {
        competitionId: { type: 'string', description: 'Competition ID' },
        query: { type: 'string', description: 'Player name search query' },
      },
      required: ['competitionId', 'query'],
    },
  },
  {
    name: 'kickbase_get_competition_players',
    description: "Get all players in a competition, optionally paginated.",
    inputSchema: {
      type: 'object',
      properties: {
        competitionId: { type: 'string', description: 'Competition ID' },
        start: { type: 'string', description: 'Pagination start offset' },
        max: { type: 'string', description: 'Max number of players to return' },
      },
      required: ['competitionId'],
    },
  },
  {
    name: 'kickbase_get_competition_player',
    description: "Get detailed information about a specific player in a competition.",
    inputSchema: {
      type: 'object',
      properties: {
        competitionId: { type: 'string', description: 'Competition ID' },
        playerId: { type: 'string', description: 'Player ID' },
      },
      required: ['competitionId', 'playerId'],
    },
  },
  {
    name: 'kickbase_get_competition_table',
    description: "Get the current league table / standings for a football competition.",
    inputSchema: {
      type: 'object',
      properties: {
        competitionId: { type: 'string', description: 'Competition ID' },
      },
      required: ['competitionId'],
    },
  },
  {
    name: 'kickbase_get_matchdays',
    description:
      "Get matchdays for a competition including fixtures, dates and status. " +
      "This returns all 34 matchdays and is by far the largest response of any tool — " +
      "always pass 'day' unless you genuinely need the full season.",
    inputSchema: {
      type: 'object',
      properties: {
        competitionId: { type: 'string', description: 'Competition ID' },
        day: {
          type: 'string',
          description:
            "Return only this matchday (e.g. '5'), or 'current' for the ongoing one. " +
            "Omit to return the entire season.",
        },
      },
      required: ['competitionId'],
    },
  },

  // --- Base / Live ---
  {
    name: 'kickbase_get_base_overview',
    description:
      "Get the base overview including live match information and current matchday status.",
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'kickbase_get_stage',
    description: "Get the current stage/matchday information including active competitions.",
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
];

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

type Args = Record<string, unknown>;

const handlers: Record<string, (args: Args) => Promise<unknown>> = {
  kickbase_get_profile: () => apiGet('/v4/user/me'),

  kickbase_list_leagues: () => apiGet('/v4/leagues'),

  kickbase_get_league_overview: ({ leagueId }) =>
    apiGet(`/v4/leagues/${leagueId}/overview`),

  kickbase_get_league_ranking: ({ leagueId }) =>
    apiGet(`/v4/leagues/${leagueId}/ranking`),

  kickbase_get_my_squad: ({ leagueId }) =>
    apiGet(`/v4/leagues/${leagueId}/squad`),

  kickbase_get_my_budget: ({ leagueId }) =>
    apiGet(`/v4/leagues/${leagueId}/me/budget`),

  kickbase_get_my_league_info: ({ leagueId }) =>
    apiGet(`/v4/leagues/${leagueId}/me`),

  kickbase_get_activities_feed: ({ leagueId, start, max }) =>
    apiGet(`/v4/leagues/${leagueId}/activitiesFeed`, {
      start: start as string | undefined,
      max: max as string | undefined,
    }),

  kickbase_get_lineup: ({ leagueId }) =>
    apiGet(`/v4/leagues/${leagueId}/lineup`),

  kickbase_get_lineup_overview: ({ leagueId }) =>
    apiGet(`/v4/leagues/${leagueId}/lineup/overview`),

  kickbase_get_lineup_selection: ({ leagueId }) =>
    apiGet(`/v4/leagues/${leagueId}/lineup/selection`),

  kickbase_fill_lineup: ({ leagueId, formation, playerIds }) =>
    apiPost(`/v4/leagues/${leagueId}/lineup/fill`, {
      lud: formation,
      pls: playerIds,
    }),

  kickbase_get_market: ({ leagueId }) =>
    apiGet(`/v4/leagues/${leagueId}/market`),

  kickbase_sell_player: ({ leagueId, playerId }) =>
    apiPost(`/v4/leagues/${leagueId}/market/${playerId}/sell`),

  kickbase_remove_from_market: ({ leagueId, playerId }) =>
    apiDelete(`/v4/leagues/${leagueId}/market/${playerId}`),

  kickbase_list_player_offers: ({ leagueId, playerId }) =>
    apiGet(`/v4/leagues/${leagueId}/players/${playerId}/transfers`),

  kickbase_place_offer: ({ leagueId, playerId, price }) =>
    apiPost(`/v4/leagues/${leagueId}/market/${playerId}/offers`, { price }),

  kickbase_accept_offer: ({ leagueId, playerId, offerId }) =>
    apiPost(`/v4/leagues/${leagueId}/market/${playerId}/offers/${offerId}/accept`),

  kickbase_decline_offer: ({ leagueId, playerId, offerId }) =>
    apiPost(`/v4/leagues/${leagueId}/market/${playerId}/offers/${offerId}/decline`),

  kickbase_get_league_player: ({ leagueId, playerId }) =>
    apiGet(`/v4/leagues/${leagueId}/players/${playerId}`),

  kickbase_get_player_market_value: ({ leagueId, playerId, timeframe }) =>
    apiGet(`/v4/leagues/${leagueId}/players/${playerId}/marketValue/${timeframe}`),

  kickbase_get_player_performance: ({ leagueId, playerId }) =>
    apiGet(`/v4/leagues/${leagueId}/players/${playerId}/performance`),

  kickbase_get_player_transfer_history: ({ leagueId, playerId }) =>
    apiGet(`/v4/leagues/${leagueId}/players/${playerId}/transferHistory`),

  kickbase_get_manager_squad: ({ leagueId, managerId }) =>
    apiGet(`/v4/leagues/${leagueId}/managers/${managerId}/squad`),

  kickbase_get_manager_performance: ({ leagueId, managerId }) =>
    apiGet(`/v4/leagues/${leagueId}/managers/${managerId}/performance`),

  kickbase_list_competitions: () => apiGet('/v4/competitions'),

  kickbase_search_players: ({ competitionId, query }) =>
    apiGet(`/v4/competitions/${competitionId}/players/search`, {
      query: query as string,
    }),

  kickbase_get_competition_players: ({ competitionId, start, max }) =>
    apiGet(`/v4/competitions/${competitionId}/players`, {
      start: start as string | undefined,
      max: max as string | undefined,
    }),

  kickbase_get_competition_player: ({ competitionId, playerId }) =>
    apiGet(`/v4/competitions/${competitionId}/players/${playerId}`),

  kickbase_get_competition_table: ({ competitionId }) =>
    apiGet(`/v4/competitions/${competitionId}/table`),

  kickbase_get_matchdays: async ({ competitionId, day }) => {
    const data = (await apiGet(`/v4/competitions/${competitionId}/matchdays`)) as {
      it?: { day?: number }[];
      day?: number;
    };

    if (day === undefined || day === '' || !Array.isArray(data.it)) return data;

    const wanted = day === 'current' ? data.day : Number(day);
    if (wanted === undefined || Number.isNaN(wanted)) return data;

    return { ...data, it: data.it.filter((entry) => entry.day === wanted) };
  },

  kickbase_get_base_overview: () => apiGet('/v4/base/overview'),

  kickbase_get_stage: () => apiGet('/v4/base/stage'),
};

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new Server(
  { name: 'kickbase-mcp-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  const handler = handlers[name];
  if (!handler) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  try {
    const result = await handler(args as Args);
    // Compact on purpose — indentation is ~38% of the payload and buys the
    // consuming model nothing.
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
