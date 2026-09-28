/**
 * 사용자 1명 전제의 단일 비밀번호 인증.
 *
 * 계정·회원가입·비밀번호 재설정이 필요 없으므로 DB에 사용자 테이블을 두지 않는다.
 * 비밀번호는 환경변수에 있고, 로그인에 성공하면 서명된 쿠키 하나를 내려준다.
 *
 * Web Crypto(HMAC-SHA256)만 쓰므로 Edge 런타임(middleware)에서도 그대로 돈다.
 */

export const SESSION_COOKIE = "lr_session";
const SESSION_DAYS = 30;

const encoder = new TextEncoder();

function requireSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET이 설정되지 않았습니다.");
  return secret;
}

/** 비밀번호가 설정되지 않았다면 인증을 요구하지 않는다(로컬 편의). */
export function isAuthEnabled(): boolean {
  return !!process.env.AUTH_PASSWORD && !!process.env.AUTH_SECRET;
}

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return btoa(String.fromCharCode(...arr))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(requireSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return base64url(sig);
}

/** 타이밍 공격을 피하려고 길이와 내용을 상수 시간으로 비교한다. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** 만료시각을 담아 서명한 세션 토큰을 만든다. */
export async function createSessionToken(): Promise<string> {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = String(expiresAt);
  return `${payload}.${await sign(payload)}`;
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return false;

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  if (!safeEqual(signature, await sign(payload))) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export function verifyPassword(input: unknown): boolean {
  const expected = process.env.AUTH_PASSWORD;
  if (!expected) return false;
  return typeof input === "string" && safeEqual(input, expected);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};
