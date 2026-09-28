import { CurriculumPart } from "../types/note";

/**
 * 목차 트리를 다루는 순수 함수. 서버/클라이언트 양쪽에서 쓴다.
 * (파일을 읽는 쪽은 `lib/server/curriculum.ts`)
 */

export interface FlatCurriculumItem {
  code: string;
  title: string;
  page: number;
  noteId?: string;
  partCode: string;
  chapterCode: string;
  sectionCode: string;
  sectionTitle: string;
}

/** 트리를 목차 순서대로 평탄화한 항 목록 */
export function flattenCurriculum(
  parts: CurriculumPart[],
): FlatCurriculumItem[] {
  return parts.flatMap((part) =>
    part.chapters.flatMap((chapter) =>
      chapter.sections.flatMap((section) =>
        section.items.map((item) => ({
          ...item,
          partCode: part.code,
          chapterCode: chapter.code,
          sectionCode: section.code,
          sectionTitle: section.title,
        })),
      ),
    ),
  );
}

/**
 * 목차의 항 위치에서 필기 id를 유도한다.
 *
 *   Part02 + 항 "1.1.6"  →  note-2-1-1-6
 *
 * curriculum.json에 noteId를 적어두지 않는 이유: 적어두면 필기 파일을 추가할 때마다
 * 목차도 같이 고쳐야 하고, 실재하지 않는 필기를 가리키는 참조가 생길 수 있다.
 * 파일 존재 여부가 곧 "필기했는지"가 되도록 한다.
 */
export function noteIdFor(partCode: string, itemCode: string): string {
  const part = Number(partCode.replace(/\D/g, ""));
  return `note-${part}-${itemCode.replaceAll(".", "-")}`;
}

export interface CurriculumLocation {
  partCode: string;
  part: number;
  chapter: number;
  section: string;
  item: string;
  title: string;
  page: number;
}

/**
 * 필기 id로 교재상의 위치를 되찾는다.
 * 새 필기를 만들 때 book 정보를 손으로 입력하지 않게 하려는 것.
 */
export function findLocationByNoteId(
  parts: CurriculumPart[],
  noteId: string,
): CurriculumLocation | null {
  for (const part of parts) {
    for (const chapter of part.chapters) {
      for (const section of chapter.sections) {
        for (const item of section.items) {
          if (noteIdFor(part.code, item.code) !== noteId) continue;
          return {
            partCode: part.code,
            part: Number(part.code.replace(/\D/g, "")),
            chapter: Number(chapter.code),
            section: section.code,
            item: item.code,
            title: item.title,
            page: item.page,
          };
        }
      }
    }
  }
  return null;
}

/** 실제로 존재하는 필기 id를 받아 트리에 noteId를 채워 넣는다. */
export function attachNoteIds(
  parts: CurriculumPart[],
  existingNoteIds: Set<string>,
): CurriculumPart[] {
  return parts.map((part) => ({
    ...part,
    chapters: part.chapters.map((chapter) => ({
      ...chapter,
      sections: chapter.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => {
          const id = noteIdFor(part.code, item.code);
          return existingNoteIds.has(id)
            ? { ...item, noteId: id }
            : { ...item, noteId: undefined };
        }),
      })),
    })),
  }));
}
