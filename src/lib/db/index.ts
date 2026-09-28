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

function createPool(): Pool {
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL이 설정되지 않았습니다. .env.local을 확인하세요.",
    );
  }
  return new Pool({
    connectionString,
    // Neon은 TLS 필수, 로컬은 불필요. 연결 문자열의 sslmode로 판단한다.
    ssl: connectionString.includes("sslmode=require")
      ? { rejectUnauthorized: true }
      : undefined,
    max: 5,
  });
}

function getPool(): Pool {
  globalThis.__linuxrecallPool ??= createPool();
  return globalThis.__linuxrecallPool;
}

export const db = drizzle(getPool(), { schema });
export { schema };
