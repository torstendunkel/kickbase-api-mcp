import { describe, expect, it } from 'vitest';
import { CHARACTER_LIMIT, toContent, toError } from './format.js';

describe('toContent', () => {
  it('serializes the result as compact JSON with no indentation', () => {
    expect(toContent({ a: 1, b: [1, 2] }).content[0]).toEqual({ type: 'text', text: '{"a":1,"b":[1,2]}' });
  });

  it('passes small responses through untouched', () => {
    const result = toContent({ ok: true });
    expect(result.isError).toBeUndefined();
  });

  it('truncates responses over CHARACTER_LIMIT and explains why', () => {
    const big = { it: 'x'.repeat(CHARACTER_LIMIT + 500) };
    const text = toContent(big).content[0] as { type: 'text'; text: string };

    expect(text.text.length).toBeGreaterThan(CHARACTER_LIMIT);
    expect(text.text.length).toBeLessThan(JSON.stringify(big).length);
    expect(text.text).toContain('truncated');
    expect(text.text).toContain('narrow the request');
  });

  it('does not truncate responses at or under CHARACTER_LIMIT', () => {
    const exact = { it: 'x'.repeat(CHARACTER_LIMIT - 20) };
    const text = toContent(exact).content[0] as { type: 'text'; text: string };
    expect(text.text).toBe(JSON.stringify(exact));
  });
});

describe('toError', () => {
  it('formats Error instances with their message', () => {
    const result = toError(new Error('boom'));
    expect(result.isError).toBe(true);
    expect(result.content[0]).toEqual({ type: 'text', text: 'Error: boom' });
  });

  it('stringifies non-Error throwables', () => {
    const result = toError('plain string failure');
    expect(result.content[0]).toEqual({ type: 'text', text: 'Error: plain string failure' });
  });
});
