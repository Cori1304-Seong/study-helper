#!/usr/bin/env node
/**
 * 고아가 된 진도 기록을 조회/정리한다.
 *
 *   npm run db:prune            조회만 (아무것도 지우지 않는다)
 *   npm run db:prune -- --apply 실제 삭제 (확인 프롬프트)
 *   npm run db:prune -- --apply --yes   프롬프트 없이 삭제
 *
 * 필기 JSON을 손으로 고치면 사라진 문제의 기록이 DB에 남는다. 편집 화면으로
 * 저장할 때만 도는 정리 로직(`PUT /api/notes/[id]`)을 손으로 돌리는 셈이다.
 *
 * id 계산을 여기서 하지 않고 `POST /api/progress/prune`에 맡긴다. 규칙을
 * 베껴 쓰면 `src/lib/questions.ts`와 어긋나는 순간 살아 있는 기록을 지운다.
 * 그래서 **next dev가 떠 있어야** 한다. 붙는 DB도 그 서버의 환경이 정한다
 * (`npm run dev`면 .env.local, Neon을 보려면 서버를 Neon 환경으로 띄울 것).
 */
import { createInterface } from "node:readline/promises";
// @next/env는 CommonJS라 named import가 안 된다 (drizzle.config.ts는 TS라 된다)
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const assumeYes = args.includes("--yes") || !!process.env.CI;
const baseUrl = (
  args.find((a) => a.startsWith("--url="))?.slice(6) ??
  process.env.PRUNE_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");

/** 단일 비밀번호 게이트가 켜져 있으면 세션 쿠키를 받아 온다. */
async function login() {
  const password = process.env.AUTH_PASSWORD;
  if (!password) return undefined;

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    console.error(`✗ 로그인 실패 (${res.status}). AUTH_PASSWORD를 확인하세요.`);
    process.exit(1);
  }
  return res.headers.getSetCookie?.().join("; ") ?? undefined;
}

async function prune(cookie, doApply) {
  const res = await fetch(`${baseUrl}/api/progress/prune`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({ apply: doApply }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    console.error(`✗ ${data?.error ?? `요청 실패 (${res.status})`}`);
    process.exit(1);
  }
  return data;
}

const cookie = await login().catch((e) => {
  console.error(`✗ ${baseUrl} 에 연결할 수 없습니다 — next dev가 떠 있나요?`);
  console.error(`  (${e.message})`);
  process.exit(1);
});

const report = await prune(cookie, false);
const { totals, staleQuestions, staleSections } = report;

console.log(
  `필기 ${totals.notes}개 / 파생 문제 ${totals.derivedQuestions}개 · 섹션 ${totals.derivedSections}개`,
);
console.log(
  `기록 ${totals.questionRows}행(문제) · ${totals.sectionRows}행(섹션)  →  고아 ${staleQuestions.length} · ${staleSections.length}`,
);

if (staleQuestions.length + staleSections.length === 0) {
  console.log("\n정리할 것이 없습니다.");
  process.exit(0);
}

console.log("");
for (const r of staleQuestions)
  console.log(`  [${r.status} ${r.reviewCount}회] ${r.id}`);
for (const r of staleSections) console.log(`  [섹션 ${r.status}] ${r.id}`);

if (!apply) {
  console.log("\n조회만 했습니다. 지우려면 --apply 를 붙이세요.");
  console.log("  npm run db:prune -- --apply");
  process.exit(0);
}

if (!assumeYes) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `\n위 ${staleQuestions.length + staleSections.length}행을 삭제합니다. 되돌릴 수 없습니다. 계속할까요? [y/N] `,
  );
  rl.close();
  if (answer.trim().toLowerCase() !== "y") {
    console.log("취소했습니다.");
    process.exit(1);
  }
}

const result = await prune(cookie, true);
console.log(
  `\n삭제했습니다 — 문제 ${result.staleQuestions.length}행 · 섹션 ${result.staleSections.length}행.`,
);
