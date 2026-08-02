import { afterEach, describe, expect, it } from 'vitest';
import { isCacheable, stripImages } from './client.js';

describe('stripImages', () => {
  it('drops string values that look like image paths', () => {
    expect(stripImages({ pim: 'content/file/abc123.png', name: 'Kane' })).toEqual({ name: 'Kane' });
  });

  it('drops image URLs regardless of key name', () => {
    expect(stripImages({ anything: 'https://cdn.example.com/logo.jpg' })).toEqual({});
  });

  it('keeps non-image strings untouched', () => {
    const input = { n: 'Bundesliga', note: 'not-an-image.txt' };
    expect(stripImages(input)).toEqual(input);
  });

  it('recurses into arrays and nested objects', () => {
    const input = { it: [{ pim: 'a.png', n: 'X' }, { t1im: 'b.jpe', n: 'Y' }] };
    expect(stripImages(input)).toEqual({ it: [{ n: 'X' }, { n: 'Y' }] });
  });

  it('leaves primitives untouched', () => {
    expect(stripImages(42)).toBe(42);
    expect(stripImages(null)).toBe(null);
    expect(stripImages(true)).toBe(true);
  });
});

describe('isCacheable', () => {
  afterEach(() => {
    delete process.env.KICKBASE_CACHE_TTL;
  });

  it('treats slow-moving reference endpoints as cacheable', () => {
    expect(isCacheable('/v4/competitions')).toBe(true);
    expect(isCacheable('/v4/competitions/1/matchdays')).toBe(true);
    expect(isCacheable('/v4/competitions/1/table')).toBe(true);
    expect(isCacheable('/v4/competitions/1/players')).toBe(true);
    expect(isCacheable('/v4/competitions/1/players/search')).toBe(true);
    expect(isCacheable('/v4/base/stage')).toBe(true);
  });

  it('never caches volatile per-user/league endpoints', () => {
    expect(isCacheable('/v4/leagues/1/market')).toBe(false);
    expect(isCacheable('/v4/leagues/1/me/budget')).toBe(false);
    expect(isCacheable('/v4/leagues/1/lineup')).toBe(false);
    expect(isCacheable('/v4/user/me')).toBe(false);
    expect(isCacheable('/v4/base/overview')).toBe(false);
  });

  it('disables caching entirely when KICKBASE_CACHE_TTL=0', () => {
    process.env.KICKBASE_CACHE_TTL = '0';
    expect(isCacheable('/v4/competitions')).toBe(false);
  });
});
