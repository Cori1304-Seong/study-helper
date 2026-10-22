import { NextResponse } from "next/server";
import { isNotesWritable, readAllNotes } from "../../../../lib/server/notes";
import { deriveAllQuestions } from "../../../../lib/questions";
import {
  deleteProgressForSections,
  getQuestionProgress,
  getSectionProgress,
} from "../../../../lib/server/progress";
import { isDatabaseConfigured } from "../../../../lib/db";

export const dynamic = "force-dynamic";

/**
 * 고아가 된 진도 기록을 정리한다. `npm run db:prune`이 호출한다.
 *
 * 필기 JSON을 손으로 고치면 사라진 문제의 기록이 DB에 남는다
 * (`PUT /api/notes/[id]`의 정리는 편집 화면으로 저장할 때만 돈다).
 *
 * 유효한 id 집합은 **반드시 deriveAllQuestions로 구한다.** 규칙을 베껴 쓰면
 * 문제 유형이 추가될 때 살아 있는 기록을 지우는 스크립트가 된다.
 *
 * 기본은 조회만 하고, `{ apply: true }`일 때만 지운다.
 */
export async function POST(request: Request) {
  if (!isNotesWritable)
    return NextResponse.json(
      { error: "배포 환경에서는 쓸 수 없습니다. 로컬 next dev에서 실행하세요." },
      { status: 403 },
    );
  if (!isDatabaseConfigured)
    return NextResponse.json(
      { error: "DATABASE_URL이 설정되지 않았습니다." },
      { status: 503 },
    );

  const body = (await request.json().catch(() => null)) as {
    apply?: unknown;
  } | null;
  const apply = body?.apply === true;

  const notes = await readAllNotes();
  // 필기를 하나도 못 읽었다면 "전부 고아"가 되어 테이블을 비운다. 사고를 막는다.
  if (notes.length === 0)
    return NextResponse.json(
      { error: "필기를 하나도 읽지 못했습니다. data/notes를 확인하세요." },
      { status: 409 },
    );

  const keptSections = new Set(notes.flatMap((n) => n.sections.map((s) => s.id)));
  const keptQuestions = new Set(deriveAllQuestions(notes).map((q) => q.id));

  const [questionRows, sectionRows] = await Promise.all([
    getQuestionProgress(),
    getSectionProgress(),
  ]);
  const staleQuestions = questionRows.filter(
    (r) => !keptQuestions.has(r.questionId),
  );
  const staleSections = sectionRows.filter(
    (r) => !keptSections.has(r.sectionId),
  );

  if (apply)
    await deleteProgressForSections(
      staleSections.map((r) => r.sectionId),
      staleQuestions.map((r) => r.questionId),
    );

  return NextResponse.json({
    applied: apply,
    totals: {
      notes: notes.length,
      derivedQuestions: keptQuestions.size,
      derivedSections: keptSections.size,
      questionRows: questionRows.length,
      sectionRows: sectionRows.length,
    },
    staleQuestions: staleQuestions.map((r) => ({
      id: r.questionId,
      status: r.status,
      reviewCount: r.reviewCount,
    })),
    staleSections: staleSections.map((r) => ({
      id: r.sectionId,
      status: r.status,
      reviewCount: r.reviewCount,
    })),
  });
}
