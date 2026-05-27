import { NextResponse } from 'next/server';
import {
  createPinChallengeToken,
  createSessionToken,
  getAppPassword,
  getAuthSecret,
  PIN_CHALLENGE_COOKIE_NAME,
  PIN_CHALLENGE_MAX_AGE_SECONDS,
  PIN_CHALLENGE_MAX_FAILURES,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  signPinChallengePayload,
  verifyPinChallengeToken,
} from '@/lib/auth';
import { readJsonObject } from '@/lib/validation';

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;

const rateLimit = new Map<string, { count: number; resetAt: number }>();

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return forwardedFor || realIp || 'local';
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const existing = rateLimit.get(key);
  if (!existing || existing.resetAt <= now) {
    rateLimit.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (existing.count >= RATE_LIMIT_MAX_ATTEMPTS) return false;
  existing.count++;
  return true;
}

function clearRateLimit(key: string) {
  rateLimit.delete(key);
}

function getPartialDigits(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.some(([key, digit]) => !/^[0-5]$/.test(key) || typeof digit !== 'string' || !/^\d$/.test(digit))) return null;
  return value as Record<string, string>;
}

async function setRotatedChallenge(response: NextResponse, authSecret: string) {
  const { payload, token } = await createPinChallengeToken(authSecret);
  response.cookies.set({
    name: PIN_CHALLENGE_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: PIN_CHALLENGE_MAX_AGE_SECONDS,
  });
  return payload.positions;
}

function getCookieValue(request: Request, name: string): string | undefined {
  return request.headers
    .get('cookie')
    ?.split('; ')
    .find(cookie => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export async function POST(request: Request) {
  const appPassword = getAppPassword();
  const authSecret = getAuthSecret();

  if (!appPassword || !authSecret || !/^\d{6}$/.test(appPassword)) {
    return NextResponse.json({ error: 'Auth is not configured for a 6-digit PIN' }, { status: 500 });
  }

  const clientKey = getClientKey(request);
  if (!checkRateLimit(clientKey)) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' }, { status: 429 });
  }

  const challenge = await verifyPinChallengeToken(
    getCookieValue(request, PIN_CHALLENGE_COOKIE_NAME),
    authSecret
  );

  if (!challenge) {
    const response = NextResponse.json({ error: 'Challenge kadaluarsa', rotate: true }, { status: 401 });
    await setRotatedChallenge(response, authSecret);
    return response;
  }

  const bodyResult = await readJsonObject(request);
  if (!bodyResult.ok) return NextResponse.json({ error: bodyResult.error }, { status: 400 });

  const digits = getPartialDigits(bodyResult.value.digits);
  if (!digits) return NextResponse.json({ error: 'Digit tidak valid' }, { status: 400 });

  const allPositionsFilled = challenge.positions.every(position => digits[String(position)] !== undefined);
  if (!allPositionsFilled || Object.keys(digits).length !== challenge.positions.length) {
    return NextResponse.json({ error: 'Lengkapi digit yang diminta' }, { status: 400 });
  }

  const isCorrect = challenge.positions.every(position => digits[String(position)] === appPassword[position]);
  if (!isCorrect) {
    const failures = challenge.failures + 1;
    const shouldRotate = failures >= PIN_CHALLENGE_MAX_FAILURES;
    const nextChallenge = shouldRotate
      ? await createPinChallengeToken(authSecret)
      : {
        payload: { ...challenge, failures },
        token: await signPinChallengePayload({ ...challenge, failures }, authSecret),
      };
    const response = NextResponse.json(
      { error: 'PIN salah', rotate: shouldRotate, positions: nextChallenge.payload.positions },
      { status: 401 }
    );

    response.cookies.set({
      name: PIN_CHALLENGE_COOKIE_NAME,
      value: nextChallenge.token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: PIN_CHALLENGE_MAX_AGE_SECONDS,
    });

    return response;
  }

  clearRateLimit(clientKey);
  const token = await createSessionToken(authSecret);
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  response.cookies.set({
    name: PIN_CHALLENGE_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return response;
}
