import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * 필기는 `data/notes/{id}.json` 항별 파일이라 정적 import로 번들할 수 없다.
   * 런타임에 readdir/readFile로 읽으므로 서버 트레이스에 데이터 파일을 포함시킨다.
   * (배포 환경에서는 읽기 전용으로만 쓴다 — PLANNING.md 7.1)
   */
  outputFileTracingIncludes: {
    "/*": ["data/**/*.json"],
    "/api/**": ["data/**/*.json"],
  },
};

export default nextConfig;
