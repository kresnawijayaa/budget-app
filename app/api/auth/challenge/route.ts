import { NextResponse } from 'next/server';
import {
  createPinChallengeToken,
  getAuthSecret,
  PIN_CHALLENGE_COOKIE_NAME,
  PIN_CHALLENGE_MAX_AGE_SECONDS,
} from '@/lib/auth';

export async function GET() {
  const authSecret = getAuthSecret();
  if (!authSecret) {
    return NextResponse.json({ error: 'Auth is not configured' }, { status: 500 });
  }

  const { payload, token } = await createPinChallengeToken(authSecret);
  const response = NextResponse.json({ positions: payload.positions });
  response.cookies.set({
    name: PIN_CHALLENGE_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: PIN_CHALLENGE_MAX_AGE_SECONDS,
  });

  return response;
}
