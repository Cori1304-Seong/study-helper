import { NextResponse } from "next/server";
import {
  deleteNote,
  isNotesWritable,
  isValidNoteId,
  readNote,
  validateNote,
  writeNote,
} from "../../../../lib/server/notes";
import { deriveQuestions } from "../../../../lib/questions";
import { deleteProgressForSections } from "../../../../lib/server/progress";
import { isDatabaseConfigured } from "../../../../lib/db";

export const dynamic = "force-dynamic";

const READ_ONLY = {
  error:
    "배포 환경에서는 필기를 수정할 수 없습니다. 로컬에서 고친 뒤 커밋·푸시하세요.",
};

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const note = await readNote(id);
  if (!note)
    return NextResponse.json({ error: "필기를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ note, writable: isNotesWritable });
}

export async function PUT(request: Request, { params }: Params) {
  if (!isNotesWritable) return NextResponse.json(READ_ONLY, { status: 403 });

  const { id } = await params;
  if (!isValidNoteId(id))
    return NextResponse.json({ error: "잘못된 필기 id입니다." }, { status: 400 });

  const body = await request.json().catch(() => null);
  const result = validateNote(body);
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: 400 });
  if (result.note.id !== id)
    return NextResponse.json(
      { error: "본문의 id가 경로와 다릅니다." },
      { status: 400 },
    );

  // 섹션을 지웠다면 그 섹션과 파생 문제의 기록도 함께 지운다.
  // 안 그러면 존재하지 않는 문제의 진도가 통계에 남는다.
  const before = await readNote(id);
  if (before && isDatabaseConfigured) {
    const keptSections = new Set(result.note.sections.map((s) => s.id));
    const keptQuestions = new Set(
      deriveQuestions(result.note).map((q) => q.id),
    );
    const staleSections = before.sections
      .map((s) => s.id)
      .filter((sid) => !keptSections.has(sid));
    const staleQuestions = deriveQuestions(before)
      .map((q) => q.id)
      .filter((qid) => !keptQuestions.has(qid));
    await deleteProgressForSections(staleSections, staleQuestions);
  }

  await writeNote(result.note);
  return NextResponse.json({ note: result.note });
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!isNotesWritable) return NextResponse.json(READ_ONLY, { status: 403 });

  const { id } = await params;
  const note = await readNote(id);
  if (!note)
    return NextResponse.json({ error: "필기를 찾을 수 없습니다." }, { status: 404 });

  if (isDatabaseConfigured)
    await deleteProgressForSections(
      note.sections.map((s) => s.id),
      deriveQuestions(note).map((q) => q.id),
    );

  await deleteNote(id);
  return NextResponse.json({ ok: true });
}
