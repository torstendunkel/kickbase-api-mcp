import { describe, expect, it } from 'vitest';
import { selectMatchday } from './competitions.js';

const season = {
  day: 5,
  it: [{ day: 1 }, { day: 2 }, { day: 3 }, { day: 4 }, { day: 5 }, { day: 6 }],
};

describe('selectMatchday', () => {
  it('returns the full season when day is omitted', () => {
    expect(selectMatchday(season, undefined)).toBe(season);
  });

  it('returns the full season when day is an empty string', () => {
    expect(selectMatchday(season, '')).toBe(season);
  });

  it('filters to a single matchday by number', () => {
    expect(selectMatchday(season, '3').it).toEqual([{ day: 3 }]);
  });

  it("resolves 'current' to the response's own day field", () => {
    expect(selectMatchday(season, 'current').it).toEqual([{ day: 5 }]);
  });

  it('falls back to the full season for a non-numeric day', () => {
    expect(selectMatchday(season, 'not-a-number')).toBe(season);
  });

  it('falls back to the full season when the response has no it[] array', () => {
    const malformed = { day: 5 };
    expect(selectMatchday(malformed, '3')).toBe(malformed);
  });
});
