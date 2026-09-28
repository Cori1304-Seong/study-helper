import { NextResponse } from "next/server";
import { readAllNotes, isNotesWritable } from "../../../lib/server/notes";
import { attachNoteIds, readCurriculum } from "../../../lib/server/curriculum";
import {
  getQuestionProgress,
  getSectionProgress,
} from "../../../lib/server/progress";
import { isDatabaseConfigured } from "../../../lib/db";

export const dynamic = "force-dynamic";

/**
 * 첫 화면에 필요한 것을 한 번에 내려준다.
 *
 * 필기·목차(파일)와 학습 상태(DB)는 저장소가 다르지만 화면에서는 늘 같이 쓰인다.
 * 라운드트립 3번을 1번으로 줄이려고 묶었다.
 */
export async function GET() {
  try {
    const [notes, curriculumRaw] = await Promise.all([
      readAllNotes(),
      readCurriculum(),
    ]);

    const noteIds = new Set(notes.map((n) => n.id));
    const curriculum = attachNoteIds(curriculumRaw, noteIds);

    if (!isDatabaseConfigured) {
      return NextResponse.json({
        notes,
        curriculum,
        questionProgress: [],
        sectionProgress: [],
        notesWritable: isNotesWritable,
        databaseConfigured: false,
      });
    }

    const [questionProgress, sectionProgress] = await Promise.all([
      getQuestionProgress(),
      getSectionProgress(),
    ]);

    return NextResponse.json({
      notes,
      curriculum,
      questionProgress,
      sectionProgress,
      notesWritable: isNotesWritable,
      databaseConfigured: true,
    });
  } catch (e) {
    console.error("[bootstrap]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "불러오기에 실패했습니다." },
      { status: 500 },
    );
  }
}
