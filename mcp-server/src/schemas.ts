import { z } from 'zod';

// Shared field schemas reused across tool definitions to keep validation and
// descriptions consistent.

export const leagueId = z.string().min(1).describe('League ID');
export const playerId = z.string().min(1).describe('Player ID');
export const managerId = z.string().min(1).describe('Manager (user) ID');
export const competitionId = z.string().min(1).describe('Competition ID');

export const paginationStart = z
  .string()
  .regex(/^\d+$/, 'Must be a non-negative integer')
  .optional()
  .describe('Pagination start offset');

export const paginationMax = z
  .string()
  .regex(/^\d+$/, 'Must be a non-negative integer')
  .optional()
  .describe('Max number of items to return');
