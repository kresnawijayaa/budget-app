export const SESSION_COOKIE_NAME = 'budget_session';
export const PIN_CHALLENGE_COOKIE_NAME = 'budget_pin_challenge';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const PIN_CHALLENGE_MAX_AGE_SECONDS = 60 * 10;
export const PIN_LENGTH = 6;
export const PIN_CHALLENGE_DIGITS = 2;
export const PIN_CHALLENGE_MAX_FAILURES = 3;

interface SessionPayload {
  exp: number;
}

export interface PinChallengePayload {
  positions: number[];
  failures: number;
  exp: number;
}

function base64UrlEncode(input: string | ArrayBuffer): string {
  const bytes = typeof input === 'string'
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return base64UrlEncode(signature);
}

async function createSignedToken(payload: object, secret: string): Promise<string> {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

async function verifySignedToken<T extends object>(token: string | undefined, secret: string): Promise<T | null> {
  if (!token || !secret) return null;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = await sign(encodedPayload, secret);
  if (signature !== expectedSignature) return null;

  try {
    return JSON.parse(base64UrlDecode(encodedPayload)) as T;
  } catch {
    return null;
  }
}

export function getAuthSecret(): string {
  return process.env.AUTH_SECRET || process.env.APP_PASSWORD || '';
}

export function getAppPassword(): string {
  return process.env.APP_PASSWORD || '';
}

export async function createSessionToken(secret: string): Promise<string> {
  const payload: SessionPayload = {
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  return createSignedToken(payload, secret);
}

export async function verifySessionToken(token: string | undefined, secret: string): Promise<boolean> {
  const payload = await verifySignedToken<Partial<SessionPayload>>(token, secret);
  return typeof payload?.exp === 'number' && payload.exp > Math.floor(Date.now() / 1000);
}

export function createPinChallenge(failures = 0): PinChallengePayload {
  const positions = new Set<number>();
  while (positions.size < PIN_CHALLENGE_DIGITS) {
    positions.add(Math.floor(Math.random() * PIN_LENGTH));
  }

  return {
    positions: Array.from(positions).sort((a, b) => a - b),
    failures,
    exp: Math.floor(Date.now() / 1000) + PIN_CHALLENGE_MAX_AGE_SECONDS,
  };
}

export async function createPinChallengeToken(secret: string, failures = 0): Promise<{ payload: PinChallengePayload; token: string }> {
  const payload = createPinChallenge(failures);
  return { payload, token: await createSignedToken(payload, secret) };
}

export async function signPinChallengePayload(payload: PinChallengePayload, secret: string): Promise<string> {
  return createSignedToken(payload, secret);
}

export async function verifyPinChallengeToken(token: string | undefined, secret: string): Promise<PinChallengePayload | null> {
  const payload = await verifySignedToken<Partial<PinChallengePayload>>(token, secret);
  if (!payload || typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) return null;
  if (!Array.isArray(payload.positions) || payload.positions.length !== PIN_CHALLENGE_DIGITS) return null;
  if (!payload.positions.every(position => Number.isInteger(position) && position >= 0 && position < PIN_LENGTH)) return null;
  if (typeof payload.failures !== 'number' || !Number.isInteger(payload.failures) || payload.failures < 0) return null;

  return {
    positions: payload.positions,
    failures: payload.failures,
    exp: payload.exp,
  };
}
