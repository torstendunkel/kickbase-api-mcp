const BASE_URL = 'https://api.kickbase.com';

interface TokenState {
  token: string | null;
  refreshToken: string | null;
  expiresAt: number;
}

const state: TokenState = {
  token: null,
  refreshToken: null,
  expiresAt: 0,
};

export function invalidateToken(): void {
  state.token = null;
  state.expiresAt = 0;
}

export async function getToken(): Promise<string> {
  // Static token override — useful for testing or pre-obtained tokens
  if (process.env.KICKBASE_TOKEN) {
    return process.env.KICKBASE_TOKEN;
  }

  if (state.token && Date.now() < state.expiresAt) {
    return state.token;
  }

  if (state.refreshToken) {
    try {
      await doRefresh();
      return state.token!;
    } catch {
      // Fall through to fresh login
    }
  }

  await doLogin();
  return state.token!;
}

async function doLogin(): Promise<void> {
  const email = process.env.KICKBASE_EMAIL;
  const password = process.env.KICKBASE_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Missing credentials: set KICKBASE_EMAIL and KICKBASE_PASSWORD env vars ' +
        '(or KICKBASE_TOKEN for a pre-obtained bearer token).'
    );
  }

  const res = await fetch(`${BASE_URL}/v4/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ em: email, pass: password }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Kickbase login failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  // Response uses "tkn" (not "token") and expiry in "tknex"
  state.token = (data.tkn ?? data.token) as string;
  state.refreshToken = ((data.refreshToken ?? data.rtkn) as string | undefined) ?? null;
  const expiry = data.tknex ? new Date(data.tknex as string).getTime() - 10 * 60 * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000 - 10 * 60 * 1000;
  state.expiresAt = expiry;
}

async function doRefresh(): Promise<void> {
  const res = await fetch(`${BASE_URL}/v4/user/refreshtokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ rtkn: state.refreshToken }),
  });

  if (!res.ok) throw new Error('Token refresh failed');

  const data = (await res.json()) as Record<string, unknown>;
  state.token = data.token as string;
  state.refreshToken =
    ((data.refreshToken ?? data.rtkn) as string | undefined) ?? state.refreshToken;
  state.expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000 - 10 * 60 * 1000;
}
