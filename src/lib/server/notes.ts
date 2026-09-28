import "server-only";

import path from "node:path";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { Note, NoteSection, NoteSectionKind } from "../../types/note";

/**
 * 필기 저장소 (PLANNING.md 원칙 4 / 7.1).
 *
 * 필기는 `data/notes/{id}.json` — 항 1개당 파일 1개다. 62개를 한 파일에 넣으면
 * git diff를 읽을 수 없고 편집이 위험해지기 때문이다.
 *
 * - 로컬 `next dev`: 읽기/쓰기 모두 가능.
 * - 배포(Vercel): 런타임 파일시스템이 읽기 전용이라 **읽기만** 된다.
 *   필기 추가는 로컬 작성 → 커밋 → 푸시 → 재배포.
 */

const NOTES_DIR = path.join(process.cwd(), "data", "notes");

/** 배포 환경에서는 필기를 고칠 수 없다. 화면에서 편집 UI를 잠그는 데 쓴다. */
export const isNotesWritable = process.env.NODE_ENV === "development";

const notePath = (id: string) => path.join(NOTES_DIR, `${id}.json`);

/** `../`나 슬래시가 섞인 id로 디렉터리를 벗어나지 못하게 막는다. */
export function isValidNoteId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

export async function readAllNotes(): Promise<Note[]> {
  let files: string[];
  try {
    files = await readdir(NOTES_DIR);
  } catch {
    return []; // 아직 필기가 하나도 없는 상태
  }

  const notes = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        const raw = await readFile(path.join(NOTES_DIR, f), "utf-8");
        return JSON.parse(raw) as Note;
      }),
  );

  // 목차 순서(2.1.1.1 → 3.2.1)대로 정렬해 화면마다 다시 정렬하지 않게 한다
  return notes.sort((a, b) => noteOrderKey(a).localeCompare(noteOrderKey(b)));
}

export async function readNote(id: string): Promise<Note | null> {
  if (!isValidNoteId(id)) return null;
  try {
    return JSON.parse(await readFile(notePath(id), "utf-8")) as Note;
  } catch {
    return null;
  }
}

export async function writeNote(note: Note): Promise<void> {
  await mkdir(NOTES_DIR, { recursive: true });
  const target = notePath(note.id);
  // 쓰는 도중 죽어도 원본이 잘리지 않도록 임시 파일에 쓰고 교체한다
  const tmp = `${target}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(note, null, 2) + "\n", "utf-8");
  await rename(tmp, target);
}

export async function deleteNote(id: string): Promise<void> {
  if (!isValidNoteId(id)) return;
  await unlink(notePath(id)).catch(() => {});
}

/** "2.01.1.1.06" 처럼 자리수를 맞춰 문자열 정렬이 목차 순서와 같아지게 한다 */
function noteOrderKey(note: Note): string {
  return [
    String(note.book.part),
    String(note.book.chapter).padStart(2, "0"),
    ...note.book.item.split(".").map((n) => n.padStart(3, "0")),
  ].join(".");
}

// ---------------------------------------------------------------------------
// 검증 — 외부(편집 화면)에서 들어온 JSON을 그대로 파일에 쓰지 않는다
// ---------------------------------------------------------------------------

const KINDS: NoteSectionKind[] = [
  "overview",
  "command",
  "file",
  "config",
  "steps",
];

export type ValidationResult =
  | { ok: true; note: Note }
  | { ok: false; error: string };

export function validateNote(input: unknown): ValidationResult {
  if (!input || typeof input !== "object")
    return fail("필기가 객체가 아닙니다.");
  const n = input as Partial<Note>;

  if (typeof n.id !== "string" || !isValidNoteId(n.id))
    return fail("id는 영문/숫자/-/_ 조합이어야 합니다.");
  if (typeof n.title !== "string" || !n.title.trim())
    return fail("제목이 비어 있습니다.");
  if (!n.book || typeof n.book !== "object")
    return fail("book(교재 위치) 정보가 없습니다.");

  const { part, chapter, section, item, page } = n.book;
  if (typeof part !== "number" || typeof chapter !== "number")
    return fail("book.part / book.chapter는 숫자여야 합니다.");
  if (typeof section !== "string" || typeof item !== "string")
    return fail("book.section / book.item은 문자열이어야 합니다.");
  if (typeof page !== "number") return fail("book.page는 숫자여야 합니다.");

  if (!Array.isArray(n.sections)) return fail("sections가 배열이 아닙니다.");

  const seen = new Set<string>();
  for (const s of n.sections as NoteSection[]) {
    if (!s || typeof s !== "object") return fail("섹션이 객체가 아닙니다.");
    if (typeof s.id !== "string" || !s.id.startsWith(`${n.id}/`))
      return fail(`섹션 id는 "${n.id}/..." 로 시작해야 합니다: ${s.id}`);
    if (seen.has(s.id)) return fail(`섹션 id가 중복됩니다: ${s.id}`);
    seen.add(s.id);

    if (!KINDS.includes(s.kind)) return fail(`알 수 없는 섹션 종류: ${s.kind}`);
    if (typeof s.title !== "string" || !s.title.trim())
      return fail("섹션 제목이 비어 있습니다.");

    if (s.kind === "overview" || s.kind === "config") {
      if (typeof s.body !== "string")
        return fail(`"${s.title}" 섹션은 본문(body)이 필요합니다.`);
    } else {
      if (!Array.isArray(s.items))
        return fail(`"${s.title}" 섹션은 항목(items)이 필요합니다.`);
      for (const item of s.items) {
        if (typeof item?.term !== "string" || !item.term.trim())
          return fail(`"${s.title}" 섹션에 term이 빈 항목이 있습니다.`);
        if (typeof item.desc !== "string")
          return fail(`"${item.term}"의 설명(desc)이 없습니다.`);
        if (item.detail !== undefined && typeof item.detail !== "string")
          return fail(`"${item.term}"의 상세(detail)가 문자열이 아닙니다.`);

        for (const opt of item.options ?? []) {
          if (typeof opt?.flag !== "string" || typeof opt.meaning !== "string")
            return fail(`"${item.term}"의 옵션 형식이 올바르지 않습니다.`);
          if (opt.detail !== undefined && typeof opt.detail !== "string")
            return fail(
              `"${item.term} ${opt.flag}"의 상세(detail)가 문자열이 아닙니다.`,
            );
        }
      }
    }
  }

  return {
    ok: true,
    note: {
      id: n.id,
      title: n.title,
      book: { part, chapter, section, item, page },
      summary: typeof n.summary === "string" ? n.summary : "",
      tags: Array.isArray(n.tags)
        ? n.tags.filter((t): t is string => typeof t === "string")
        : [],
      sections: n.sections as NoteSection[],
      updatedAt: new Date().toISOString(),
    },
  };
}

const fail = (error: string): ValidationResult => ({ ok: false, error });
