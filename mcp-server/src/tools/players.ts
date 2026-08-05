import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiGet } from '../client.js';
import { bulkFetch, registerApiTool } from '../format.js';
import { leagueId, playerId } from '../schemas.js';

const marketValueTimeframe = z.enum(['7', '30', '90', '365']).describe('Timeframe in days (7, 30, 90, or 365)');

// Kickbase's own timeframe param is broken: only the literal "365" returns
// data, every other value (7, 30, 90, even arbitrary numbers) comes back with
// an empty `it`. The 365-day response is one entry per day, oldest first, so
// we always fetch the full year and slice to the requested window ourselves.
function limitMarketValueTimeframe(mv: unknown, days: number): unknown {
  if (!mv || typeof mv !== 'object' || !Array.isArray((mv as { it?: unknown }).it)) return mv;
  const { it, ...rest } = mv as { it: unknown[] };
  return days >= it.length ? mv : { ...rest, it: it.slice(-days) };
}

const bulkPlayerIds = (label: string) =>
  z.array(playerId).min(1).max(100).describe(`Player IDs to fetch ${label} for (max 100 per call)`);

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

// A veteran player's full /performance history goes back to 2013 and can run
// ~55k characters — already over CHARACTER_LIMIT (25k) for a single player,
// and the first thing to blow up a bulk call. Most callers (xP estimates,
// matchday prep) only care about recent seasons, so trim server-side to the
// last N season entries (API has no season/timeframe filter for this endpoint).
const seasons = z
  .number()
  .int()
  .positive()
  .max(20)
  .optional()
  .describe('How many of the most recent seasons to include (default: 1, current season only). Full history is large and can hit the response size limit.');

function limitSeasons(perf: unknown, count: number): unknown {
  if (!perf || typeof perf !== 'object' || !Array.isArray((perf as { it?: unknown }).it)) return perf;
  const { it, ...rest } = perf as { it: unknown[] };
  return { ...rest, it: it.slice(-count) };
}

// Full matchday entries carry team IDs, goals, timestamps etc. that xP/points
// analysis doesn't need — keep only day, points, minutes played, and status
// so a full squad + candidate list fits in one bulk response.
function slimPerformance(perf: unknown): unknown {
  if (!perf || typeof perf !== 'object' || !Array.isArray((perf as { it?: unknown }).it)) return perf;
  const { it, ...rest } = perf as { it: Array<Record<string, unknown>> };
  return {
    ...rest,
    it: it.map((season) => ({
      ...season,
      ph: Array.isArray(season.ph)
        ? (season.ph as Array<Record<string, unknown>>).map((m) => ({ day: m.day, p: m.p, mp: m.mp, st: m.st }))
        : season.ph,
    })),
  };
}

export function registerPlayerTools(server: McpServer): void {
  registerApiTool(
    server,
    'kickbase_get_league_player',
    {
      title: 'Get League Player',
      description: 'Get detailed information about a specific player within a league context.',
      inputSchema: { leagueId, playerId },
      annotations: READ_ONLY,
    },
    ({ leagueId, playerId }) => apiGet(`/v4/leagues/${leagueId}/players/${playerId}`)
  );

  registerApiTool(
    server,
    'kickbase_get_player_market_value',
    {
      title: 'Get Player Market Value',
      description:
        'Get the market value history for a player over a given timeframe. Kickbase\'s own timeframe ' +
        'filter is broken upstream (only 365 returns data), so this always fetches the full year and ' +
        'trims it to the requested window server-side — the `timeframe` param works correctly regardless.',
      inputSchema: { leagueId, playerId, timeframe: marketValueTimeframe },
      annotations: READ_ONLY,
    },
    async ({ leagueId, playerId, timeframe }) =>
      limitMarketValueTimeframe(
        await apiGet(`/v4/leagues/${leagueId}/players/${playerId}/marketValue/365`),
        Number(timeframe)
      )
  );

  registerApiTool(
    server,
    'kickbase_get_market_value_bulk',
    {
      title: 'Get Market Value (Bulk)',
      description:
        'Get the market-value trend for multiple players in one call, e.g. every player currently ' +
        'listed on the transfer market or your whole squad. Fires the underlying requests in parallel ' +
        'server-side instead of one-by-one, which is far faster than calling kickbase_get_player_market_value ' +
        "per player — a 70-player scan drops from ~5s sequential to well under 1s. Results for players " +
        "that fail individually (e.g. a bad ID) are reported inline as an 'error' on that entry rather " +
        'than failing the whole batch.',
      inputSchema: {
        leagueId,
        playerIds: bulkPlayerIds('market-value trends'),
        timeframe: marketValueTimeframe,
      },
      annotations: READ_ONLY,
    },
    ({ leagueId, playerIds, timeframe }) =>
      bulkFetch(playerIds, async (playerId) =>
        limitMarketValueTimeframe(
          await apiGet(`/v4/leagues/${leagueId}/players/${playerId}/marketValue/365`),
          Number(timeframe)
        )
      )
  );

  registerApiTool(
    server,
    'kickbase_get_player_performance',
    {
      title: 'Get Player Performance',
      description:
        'Get matchday-by-matchday performance and points for a player in a league, season by season. ' +
        'By default only returns the current season — full history goes back to 2013 for veteran players ' +
        'and can exceed the response size limit; pass a higher `seasons` value for more history.',
      inputSchema: { leagueId, playerId, seasons },
      annotations: READ_ONLY,
    },
    async ({ leagueId, playerId, seasons }) =>
      limitSeasons(await apiGet(`/v4/leagues/${leagueId}/players/${playerId}/performance`), seasons ?? 1)
  );

  registerApiTool(
    server,
    'kickbase_get_player_performance_bulk',
    {
      title: 'Get Player Performance (Bulk)',
      description:
        'Get matchday-by-matchday performance and points for multiple players in one call, e.g. your ' +
        'whole squad plus a shortlist of transfer candidates when building xP estimates for a briefing. ' +
        'Fires the underlying requests in parallel server-side instead of one-by-one — the same speedup ' +
        "kickbase_get_market_value_bulk gives for market-value history applies here (order-of-magnitude " +
        "faster than calling kickbase_get_player_performance per player). By default only the current " +
        "season is returned per player, and each matchday entry is slimmed to day/points/minutes-played/" +
        "status (drops team IDs, goals, timestamps, images) — a full squad plus candidates would otherwise " +
        "blow past the response size limit. Use kickbase_get_player_performance for the full per-matchday " +
        "shape on a single player. Results for players that fail individually (e.g. a bad ID) are reported " +
        "inline as an 'error' on that entry rather than failing the whole batch.",
      inputSchema: { leagueId, playerIds: bulkPlayerIds('matchday performance'), seasons },
      annotations: READ_ONLY,
    },
    ({ leagueId, playerIds, seasons: seasonCount }) =>
      bulkFetch(playerIds, async (playerId) =>
        slimPerformance(limitSeasons(await apiGet(`/v4/leagues/${leagueId}/players/${playerId}/performance`), seasonCount ?? 1))
      )
  );

  registerApiTool(
    server,
    'kickbase_get_player_transfer_history',
    {
      title: 'Get Player Transfer History',
      description: 'Get the transfer history of a player within a league.',
      inputSchema: { leagueId, playerId },
      annotations: READ_ONLY,
    },
    ({ leagueId, playerId }) => apiGet(`/v4/leagues/${leagueId}/players/${playerId}/transferHistory`)
  );
}
