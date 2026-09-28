import { DerivedQuestion, Note, NoteSection } from "../types/note";

/**
 * 필기에서 문제를 파생시킨다 (PLANNING.md 4.1).
 * 문제는 저장하지 않으므로 이 함수가 유일한 출처이며,
 * id는 `섹션id + term + 문제유형`으로 항상 동일하게 계산된다.
 */

const KIND_LABEL: Record<DerivedQuestion["kind"], string> = {
  enumerate: "열거형",
  "recall-term": "역방향",
  "recall-desc": "정방향",
  option: "옵션형",
  format: "포맷형",
  blank: "빈칸형",
  order: "순서형",
};

export const questionKindLabel = (kind: DerivedQuestion["kind"]) =>
  KIND_LABEL[kind];

/** 설정 원문에서 빈칸 토큰을 ▢로 가린 문자열 */
export const maskConfigBody = (body: string, token: string) =>
  body
    .split("\n")
    .map((line) =>
      line.includes(token) ? line.replace(token, "▢".repeat(6)) : line,
    )
    .join("\n");

function sectionQuestions(note: Note, section: NoteSection): DerivedQuestion[] {
  const base = {
    noteId: note.id,
    noteTitle: note.title,
    sectionId: section.id,
    sectionTitle: section.title,
  };
  const items = section.items ?? [];
  const out: DerivedQuestion[] = [];

  if (section.kind === "command") {
    out.push({
      ...base,
      id: `${section.id}#enumerate`,
      kind: "enumerate",
      prompt: `「${section.title}」에 속한 ${items.length}개를 모두 나열하시오.`,
      answer: items.map((i) => i.term).join(", "),
      answerList: items.map((i) => `${i.term} — ${i.desc}`),
    });

    for (const item of items) {
      out.push({
        ...base,
        id: `${section.id}#${item.term}#recall-term`,
        kind: "recall-term",
        prompt: `${item.desc} 명령어는?`,
        answer: item.term,
        detail: item.detail,
      });
      out.push({
        ...base,
        id: `${section.id}#${item.term}#recall-desc`,
        kind: "recall-desc",
        prompt: `\`${item.term}\`의 기능은?`,
        answer: item.desc,
        detail: item.detail,
      });
      for (const opt of item.options ?? []) {
        out.push({
          ...base,
          id: `${section.id}#${item.term}#option-${opt.flag}`,
          kind: "option",
          prompt: `\`${item.term}\`에서 "${opt.meaning}"에 해당하는 옵션은?`,
          answer: opt.flag,
          // 옵션 문제에는 옵션 자신의 상세를 붙인다. 없으면 명령어의 상세로 대신한다.
          detail: opt.detail ?? item.detail,
        });
      }
    }
  }

  if (section.kind === "file") {
    out.push({
      ...base,
      id: `${section.id}#enumerate`,
      kind: "enumerate",
      prompt: `「${section.title}」의 파일 ${items.length}개를 모두 나열하시오.`,
      answer: items.map((i) => i.term).join(", "),
      answerList: items.map((i) => `${i.term} — ${i.desc}`),
    });

    for (const item of items) {
      out.push({
        ...base,
        id: `${section.id}#${item.term}#recall-term`,
        kind: "recall-term",
        prompt: `${item.desc} — 이 내용이 저장되는 파일 경로는?`,
        answer: item.term,
        detail: item.detail,
      });
      if (item.format) {
        out.push({
          ...base,
          id: `${section.id}#${item.term}#format`,
          kind: "format",
          prompt: `\`${item.term}\`의 필드 구성은?`,
          answer: item.format,
          detail: item.detail,
        });
      }
    }
  }

  if (section.kind === "config" && section.body) {
    for (const token of section.blanks ?? []) {
      out.push({
        ...base,
        id: `${section.id}#blank-${token}`,
        kind: "blank",
        prompt: `${section.path ?? "설정 원문"}에서 가려진 부분을 채우시오.`,
        answer: token,
        configBody: section.body,
        configPath: section.path,
      });
    }
  }

  if (section.kind === "steps") {
    out.push({
      ...base,
      id: `${section.id}#order`,
      kind: "order",
      prompt: `「${section.title}」의 ${items.length}단계를 올바른 순서로 배열하시오.`,
      answer: items.map((i) => i.term).join(" → "),
      answerList: items.map((i, idx) => `${idx + 1}. ${i.term} — ${i.desc}`),
    });
  }

  // overview는 자동 생성하지 않는다. 백지 인출로만 다룬다.
  return out;
}

export function deriveQuestions(note: Note): DerivedQuestion[] {
  return note.sections.flatMap((s) => sectionQuestions(note, s));
}

export function deriveAllQuestions(notes: Note[]): DerivedQuestion[] {
  return notes.flatMap(deriveQuestions);
}

/** 백지 인출 대상 섹션 수 = 전체 섹션 (overview 포함) */
export function countDerived(note: Note) {
  return {
    sections: note.sections.length,
    questions: deriveQuestions(note).length,
  };
}
