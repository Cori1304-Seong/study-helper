import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  isAuthEnabled,
  sessionCookieOptions,
  verifyPassword,
} from "../../../../lib/server/auth";

export async function POST(request: Request) {
  if (!isAuthEnabled())
    return NextResponse.json({ ok: true, authDisabled: true });

  const body = await request.json().catch(() => null);
  if (!verifyPassword((body as { password?: unknown } | null)?.password)) {
    // 무차별 대입을 조금이라도 늦춘다. 사용자 1명이라 지연이 문제되지 않는다.
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json(
      { error: "비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
  return response;
}
