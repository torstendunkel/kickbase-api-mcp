import { getToken, invalidateToken } from './auth.js';

const BASE_URL = 'https://api.kickbase.com';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return { Authorization: `Bearer ${token}`, Accept: 'application/json' };
}

// ---------------------------------------------------------------------------
// Payload slimming
//
// Kickbase responses carry a lot of image paths (pim, uim, t1im, plpim, ...).
// They are useless to an AI client but make up a large share of every payload
// (~50% of /matchdays). Values are dropped by shape, not by key name, so newly
// added image fields are covered too. Set KICKBASE_KEEP_IMAGES=1 to keep them.
// ---------------------------------------------------------------------------

const IMAGE_VALUE =
  /^(content\/file\/|user\/|https?:\/\/)?[\w./-]+\.(png|jpe?g|jpe|svg|webp|gif)$/i;

function stripImages(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripImages);

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v === 'string' && IMAGE_VALUE.test(v)) continue;
      out[k] = stripImages(v);
    }
    return out;
  }

  return value;
}

function slim(value: unknown): unknown {
  return process.env.KICKBASE_KEEP_IMAGES ? value : stripImages(value);
}

// ---------------------------------------------------------------------------
// GET cache
//
// Only slow-moving reference data is cached — never budgets, market, lineup or
// anything else a mutation can invalidate mid-session. Any POST/DELETE flushes
// the cache, so a write is always followed by fresh reads.
// KICKBASE_CACHE_TTL (seconds, 0 disables caching) overrides the default.
// ---------------------------------------------------------------------------

const CACHEABLE = [
  /^\/v4\/competitions$/,
  /^\/v4\/competitions\/[^/]+\/(matchdays|table)$/,
  /^\/v4\/competitions\/[^/]+\/players/,
  /^\/v4\/base\/stage$/,
];

const DEFAULT_TTL_MS = 5 * 60 * 1000;

function cacheTtlMs(): number {
  const raw = process.env.KICKBASE_CACHE_TTL;
  if (raw === undefined) return DEFAULT_TTL_MS;
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : DEFAULT_TTL_MS;
}

const cache = new Map<string, { value: unknown; expiresAt: number }>();
// Identical GETs issued before the first one resolves share a single request
const inFlight = new Map<string, Promise<unknown>>();

function isCacheable(path: string): boolean {
  return cacheTtlMs() > 0 && CACHEABLE.some((re) => re.test(path));
}

export function flushCache(): void {
  cache.clear();
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function withRetry(makeRequest: () => Promise<Response>): Promise<unknown> {
  let res = await makeRequest();

  if (res.status === 401 && !process.env.KICKBASE_TOKEN) {
    // Token may have expired mid-session; force a fresh login and retry once
    invalidateToken();
    res = await makeRequest();
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Kickbase API error (${res.status}): ${body}`);
  }

  return parseBody(res);
}

export async function apiGet(
  path: string,
  params?: Record<string, string | undefined>
): Promise<unknown> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, v);
    }
  }

  const key = url.toString();
  const cacheable = isCacheable(path);

  if (cacheable) {
    const hit = cache.get(key);
    if (hit && Date.now() < hit.expiresAt) return hit.value;
  }

  const pending = inFlight.get(key);
  if (pending) return pending;

  // authHeaders() is called inside the lambda so the retry gets a fresh token
  const request = withRetry(async () =>
    fetch(key, { headers: await authHeaders() })
  )
    .then((raw) => {
      const value = slim(raw);
      if (cacheable) cache.set(key, { value, expiresAt: Date.now() + cacheTtlMs() });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}

export async function apiPost(path: string, body?: unknown): Promise<unknown> {
  const encodedBody = body !== undefined ? JSON.stringify(body) : undefined;
  const result = await withRetry(async () =>
    fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
      body: encodedBody,
    })
  );
  flushCache();
  return slim(result);
}

export async function apiDelete(path: string): Promise<unknown> {
  const result = await withRetry(async () =>
    fetch(`${BASE_URL}${path}`, { method: 'DELETE', headers: await authHeaders() })
  );
  flushCache();
  return slim(result);
}
