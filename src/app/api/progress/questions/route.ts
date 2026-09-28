import { NextResponse } from "next/server";
import {
  rateQuestion,
  setQuestionSuppressed,
} from "../../../../lib/server/progress";
import { isDatabaseConfigured } from "../../../../lib/db";
import { STATUSES } from "../../../../lib/db/schema";
import { CardStatus } from "../../../../types";

export const dynamic = "force-dynamic";

const isStatus = (v: unknown): v is CardStatus =>
  typeof v === "string" && (STATUSES as readonly string[]).includes(v);

/**
 * 문제 평가 기록 또는 숨김 토글.
 * 간격·연속 횟수는 서버가 계산하므로 본문은 { id, status }면 충분하다.
 */
export async function POST(request: Request) {
  if (!isDatabaseConfigured)
    return NextResponse.json(
      { error: "DATABASE_URL이 설정되지 않았습니다." },
      { status: 503 },
    );

  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
    status?: unknown;
    suppressed?: unknown;
  } | null;

  if (typeof body?.id !== "string" || !body.id)
    return NextResponse.json({ error: "id가 없습니다." }, { status: 400 });

  try {
    if (typeof body.suppressed === "boolean") {
      await setQuestionSuppressed(body.id, body.suppressed);
      return NextResponse.json({ ok: true });
    }

    if (!isStatus(body.status))
      return NextResponse.json(
        { error: "status 값이 올바르지 않습니다." },
        { status: 400 },
      );

    await rateQuestion(body.id, body.status);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[progress/questions]", e);
    return NextResponse.json(
      { error: "학습 상태 저장에 실패했습니다." },
      { status: 500 },
    );
  }
}
