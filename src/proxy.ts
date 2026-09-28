import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  isAuthEnabled,
  verifySessionToken,
} from "./lib/server/auth";

/**
 * 단일 비밀번호 게이트.
 *
 * Next 16에서 `middleware.ts`는 `proxy.ts`로 이름이 바뀌었다.
 * Vercel URL은 공개되므로 로그인하지 않으면 아무것도 보여주지 않는다.
 * AUTH_PASSWORD/AUTH_SECRET을 설정하지 않으면(로컬 편의) 게이트가 꺼진다.
 */

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function proxy(request: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)))
    return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  // API는 리다이렉트하면 클라이언트가 HTML을 JSON으로 파싱하려 든다
  if (pathname.startsWith("/api/"))
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // 정적 자산과 Next 내부 경로는 게이트에서 제외한다
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|ico)$).*)"],
};
