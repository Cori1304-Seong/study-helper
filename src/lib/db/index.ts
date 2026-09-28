// 클라이언트 컴포넌트가 실수로 이 모듈을 import하면 빌드가 즉시 깨진다.
// DATABASE_URL이 브라우저 번들로 새는 사고를 컴파일 단계에서 막는 장치다.
import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * DB 접속. 로컬 PostgreSQL과 Neon 양쪽에 같은 코드로 붙는다.
 *
 * node-postgres 드라이버를 쓰는 이유: Neon은 TCP(pooler) 접속을 지원하므로
 * 로컬 Postgres와 드라이버를 통일할 수 있다. `@neondatabase/serverless`(HTTP)를
 * 쓰면 로컬에서 별도 프록시가 필요해진다.
 *
 * Neon 연결 문자열은 반드시 **pooler** 엔드포인트를 쓸 것:
 *   postgresql://user:pw@ep-xxx-pooler.region.aws.neon.tech/db?sslmode=require
 */

const connectionString = process.env.DATABASE_URL;

/** DB 없이도 앱이 뜨긴 해야 하므로(초기 설정 중) 플래그로 알린다. */
export const isDatabaseConfigured = !!connectionString;

declare global {
  // 개발 중 HMR이 커넥션 풀을 무한히 만들지 않도록 전역에 캐시한다
  var __linuxrecallPool: Pool | undefined;
}

/**
 * 로컬 루프백이 아니면 무조건 TLS를 켜고 인증서까지 검증한다.
 *
 * `sslmode=require` 문자열 유무로 판단하면, 그 파라미터를 빼고 붙여넣은 순간
 * 조용히 평문으로 접속한다. 접속 문자열에 비밀번호가 그대로 들어 있으므로
 * 평문 접속은 곧 자격증명 노출이다. 그래서 "암호화 쪽으로 실패"하게 만든다.
 *
 * 참고: libpq의 `sslmode=require`는 암호화만 하고 인증서를 검증하지 않는다.
 * `rejectUnauthorized: true`는 그보다 강한 `verify-full`에 가깝다.
 * Neon은 공인 CA 인증서를 쓰므로 Node 기본 신뢰 저장소로 검증된다.
 */
function needsTls(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return !["localhost", "127.0.0.1", "::1", ""].includes(host);
  } catch {
    return true; // 파싱 못 하면 안전한 쪽으로
  }
}

function createPool(): Pool {
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL이 설정되지 않았습니다. .env.local을 확인하세요.",
    );
  }
  return new Pool({
    connectionString,
    ssl: needsTls(connectionString) ? { rejectUnauthorized: true } : undefined,
    // Neon pooler를 쓰더라도 서버리스 인스턴스마다 풀이 따로 생긴다.
    // 인스턴스당 커넥션을 적게 잡아야 전체 상한에 걸리지 않는다.
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
}

function getPool(): Pool {
  globalThis.__linuxrecallPool ??= createPool();
  return globalThis.__linuxrecallPool;
}

export const db = drizzle(getPool(), { schema });
export { schema };
