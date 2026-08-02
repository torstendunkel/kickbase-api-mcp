import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiDelete, apiGet, apiPost } from '../client.js';
import { registerApiTool } from '../format.js';
import { leagueId, playerId } from '../schemas.js';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

export function registerMarketTools(server: McpServer): void {
  registerApiTool(
    server,
    'kickbase_get_market',
    {
      title: 'Get Market',
      description: 'Get all players currently listed on the transfer market in a league.',
      inputSchema: { leagueId },
      annotations: READ_ONLY,
    },
    ({ leagueId }) => apiGet(`/v4/leagues/${leagueId}/market`)
  );

  registerApiTool(
    server,
    'kickbase_sell_player',
    {
      title: 'Sell Player',
      description: 'List one of your players on the transfer market for sale.',
      inputSchema: { leagueId, playerId: playerId.describe('Player ID to list for sale') },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    ({ leagueId, playerId }) => apiPost(`/v4/leagues/${leagueId}/market/${playerId}/sell`)
  );

  registerApiTool(
    server,
    'kickbase_remove_from_market',
    {
      title: 'Remove From Market',
      description: 'Remove one of your players from the transfer market.',
      inputSchema: { leagueId, playerId: playerId.describe('Player ID to remove from market') },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    ({ leagueId, playerId }) => apiDelete(`/v4/leagues/${leagueId}/market/${playerId}`)
  );

  registerApiTool(
    server,
    'kickbase_list_player_offers',
    {
      title: 'List Player Offers',
      description:
        "Get open transfer-market offers for a player plus their current market status. " +
        "Returns 'ofs' (array of open bids, each with bidder 'u'/'uoid', name 'unm', and bid amount 'uop'), " +
        "'iotm' (player is on the transfer market), 'iposl' (player is on your sell list), " +
        "'mv' (market value), and 'prc' (listed price). " +
        "IMPORTANT: Kickbase removed visibility into other managers' incoming bids on players you don't own. " +
        "'ofs' is therefore populated mainly for (a) your own bids on someone else's listing, or " +
        "(b) bids others have placed on YOUR listed player. It will usually be empty otherwise — that is expected, not an error.",
      inputSchema: { leagueId, playerId },
      annotations: READ_ONLY,
    },
    ({ leagueId, playerId }) => apiGet(`/v4/leagues/${leagueId}/players/${playerId}/transfers`)
  );

  registerApiTool(
    server,
    'kickbase_place_offer',
    {
      title: 'Place Offer',
      description: 'Place a bid/offer on a player listed on the transfer market.',
      inputSchema: {
        leagueId,
        playerId: playerId.describe('Player ID to bid on'),
        price: z.number().positive().describe('Offer price in Kickbase currency units'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    ({ leagueId, playerId, price }) =>
      apiPost(`/v4/leagues/${leagueId}/market/${playerId}/offers`, { price })
  );

  registerApiTool(
    server,
    'kickbase_accept_offer',
    {
      title: 'Accept Offer',
      description:
        "Accept an offer on one of your players listed on the market. " +
        "Note: 'offerId' has been observed to be identical to the bidding user's ID " +
        "('u'/'uoid' in the offers list from kickbase_list_player_offers or kickbase_get_market), " +
        "not a separate offer identifier — pass that value here.",
      inputSchema: {
        leagueId,
        playerId,
        offerId: z
          .string()
          .min(1)
          .describe("Offer ID to accept (observed to equal the bidder's user ID)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    ({ leagueId, playerId, offerId }) =>
      apiPost(`/v4/leagues/${leagueId}/market/${playerId}/offers/${offerId}/accept`)
  );

  registerApiTool(
    server,
    'kickbase_decline_offer',
    {
      title: 'Decline Offer',
      description:
        "Decline an offer on one of your players listed on the market. " +
        "Note: 'offerId' has been observed to be identical to the bidding user's ID " +
        "('u'/'uoid' in the offers list from kickbase_list_player_offers or kickbase_get_market), " +
        "not a separate offer identifier — pass that value here.",
      inputSchema: {
        leagueId,
        playerId,
        offerId: z
          .string()
          .min(1)
          .describe("Offer ID to decline (observed to equal the bidder's user ID)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    ({ leagueId, playerId, offerId }) =>
      apiPost(`/v4/leagues/${leagueId}/market/${playerId}/offers/${offerId}/decline`)
  );
}
