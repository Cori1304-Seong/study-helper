import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isNotesWritable, readNote } from "../../../../../lib/server/notes";
import { readCurriculum } from "../../../../../lib/server/curriculum";
import { findLocationByNoteId } from "../../../../../lib/curriculum";
import { NoteEditor } from "../../../../../components/NoteEditor";
import { Note } from "../../../../../types/note";

export const metadata: Metadata = {
  title: "필기 편집 · LinuxRecall",
};

export const dynamic = "force-dynamic";

/**
 * 필기 편집. 같은 라우트가 신규 작성도 겸한다.
 * 필기 파일이 없으면 목차에서 위치를 찾아 빈 필기를 만들어 보여준다.
 */
export default async function NoteEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [existing, curriculum] = await Promise.all([
    readNote(id),
    readCurriculum(),
  ]);

  const location = findLocationByNoteId(curriculum, id);
  // 목차에 없는 id는 필기를 만들 근거가 없다
  if (!existing && !location) notFound();

  const note: Note = existing ?? {
    id,
    title: location!.title,
    book: {
      part: location!.part,
      chapter: location!.chapter,
      section: location!.section,
      item: location!.item,
      page: location!.page,
    },
    summary: "",
    tags: [],
    sections: [],
    updatedAt: new Date().toISOString(),
  };

  return (
    <NoteEditor
      note={note}
      isNew={!existing}
      writable={isNotesWritable}
      locationTitle={location?.title ?? note.title}
    />
  );
}
