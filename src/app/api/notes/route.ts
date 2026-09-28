import { NextResponse } from "next/server";
import {
  isNotesWritable,
  readAllNotes,
  readNote,
  validateNote,
  writeNote,
} from "../../../lib/server/notes";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    notes: await readAllNotes(),
    writable: isNotesWritable,
  });
}

/** 새 필기 생성. id는 목차 위치에서 유도된 값을 클라이언트가 보낸다. */
export async function POST(request: Request) {
  if (!isNotesWritable)
    return NextResponse.json(
      {
        error:
          "배포 환경에서는 필기를 추가할 수 없습니다. 로컬에서 작성한 뒤 커밋·푸시하세요.",
      },
      { status: 403 },
    );

  const body = await request.json().catch(() => null);
  const result = validateNote(body);
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: 400 });

  if (await readNote(result.note.id))
    return NextResponse.json(
      { error: "이미 그 항의 필기가 있습니다." },
      { status: 409 },
    );

  await writeNote(result.note);
  return NextResponse.json({ note: result.note }, { status: 201 });
}
