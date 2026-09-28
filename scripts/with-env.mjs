#!/usr/bin/env node
/**
 * 지정한 env 파일을 읽어 그 값으로 명령을 실행한다.
 *
 *   node scripts/with-env.mjs .env.prod next dev
 *
 * Next는 `.env.prod` 같은 임의 파일명을 읽지 않는다. 읽는 건
 * `.env.$(NODE_ENV).local` → `.env.local` → `.env.$(NODE_ENV)` → `.env` 뿐이다.
 * 대신 **process.env가 그 모두보다 우선**하므로, 자식 프로세스의 환경변수로
 * 넣어주면 `.env.local`을 건드리지 않고 접속 대상을 바꿀 수 있다.
 *
 * 붙는 DB를 매번 배너로 찍는다. "로컬인 줄 알았는데 운영이었다"를 막는 게 목적이다.
 */
import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const [envFile, ...command] = process.argv.slice(2);

if (!envFile || command.length === 0) {
  console.error("사용법: node scripts/with-env.mjs <env파일> <명령> [인자...]");
  process.exit(1);
}

if (!existsSync(envFile)) {
  console.error(`✗ ${envFile} 이 없습니다.`);
  console.error("  .env.example 을 복사해 만들어주세요.");
  process.exit(1);
}

/** KEY=value 형식만 읽는다. 주석·빈 줄은 건너뛰고 값의 따옴표는 벗긴다. */
function parseEnv(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

const vars = parseEnv(readFileSync(envFile, "utf8"));

/** 접속 대상을 자격증명 없이 사람이 읽을 수 있게 */
function describeTarget(url) {
  if (!url) return { label: "(DATABASE_URL 없음)", remote: false };
  try {
    const { hostname, pathname } = new URL(url);
    const local = ["localhost", "127.0.0.1", "::1"].includes(hostname);
    return {
      label: `${hostname}${pathname}`,
      remote: !local,
    };
  } catch {
    return { label: "(파싱 불가)", remote: true };
  }
}

const target = describeTarget(vars.DATABASE_URL);
const bar = "─".repeat(58);

console.log(bar);
console.log(
  `  ${target.remote ? "⚠  원격(운영) DB" : "○  로컬 DB"}   ${target.label}`,
);
console.log(`  설정 파일: ${envFile}   실행: ${command.join(" ")}`);
console.log(bar);

/** 원격 DB에 스키마를 바꾸는 명령은 한 번 더 묻는다. */
const isSchemaWrite =
  command.some((c) => c.includes("drizzle-kit")) &&
  command.some((c) => ["migrate", "push", "drop"].includes(c));

if (target.remote && isSchemaWrite && !process.env.CI) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `  운영 DB(${target.label})의 스키마를 변경합니다. 계속할까요? [y/N] `,
  );
  rl.close();
  if (answer.trim().toLowerCase() !== "y") {
    console.log("  취소했습니다.");
    process.exit(1);
  }
}

const child = spawn(command[0], command.slice(1), {
  stdio: "inherit",
  env: { ...process.env, ...vars },
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
