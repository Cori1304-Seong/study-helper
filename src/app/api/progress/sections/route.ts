import { NextResponse } from "next/server";
import { rateSection } from "../../../../lib/server/progress";
import { isDatabaseConfigured } from "../../../../lib/db";
import { STATUSES } from "../../../../lib/db/schema";
import { CardStatus } from "../../../../types";

export const dynamic = "force-dynamic";

const isStatus = (v: unknown): v is CardStatus =>
  typeof v === "string" && (STATUSES as readonly string[]).includes(v);

/** 백지 인출(섹션) 평가 기록 */
export async function POST(request: Request) {
  if (!isDatabaseConfigured)
    return NextResponse.json(
      { error: "DATABASE_URL이 설정되지 않았습니다." },
      { status: 503 },
    );

  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
    status?: unknown;
  } | null;

  if (typeof body?.id !== "string" || !body.id)
    return NextResponse.json({ error: "id가 없습니다." }, { status: 400 });
  if (!isStatus(body.status))
    return NextResponse.json(
      { error: "status 값이 올바르지 않습니다." },
      { status: 400 },
    );

  try {
    await rateSection(body.id, body.status);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[progress/sections]", e);
    return NextResponse.json(
      { error: "학습 상태 저장에 실패했습니다." },
      { status: 500 },
    );
  }
}
