import path from "node:path";
import { readFile } from "node:fs/promises";
import { CurriculumPart } from "../../types/note";

/**
 * 교재 목차 트리를 파일에서 읽는다. 필기하지 않은 항도 목록에 있어야
 * "어디까지 필기했는지" 진도가 나온다 (PLANNING.md 7.1).
 *
 * 필기와 달리 거의 바뀌지 않으므로 프로세스 수명 동안 캐시한다.
 * 트리를 가공하는 순수 함수는 `lib/curriculum.ts`에 있다.
 */

const CURRICULUM_PATH = path.join(process.cwd(), "data", "curriculum.json");

let cached: CurriculumPart[] | null = null;

export async function readCurriculum(): Promise<CurriculumPart[]> {
  if (cached) return cached;
  const raw = await readFile(CURRICULUM_PATH, "utf-8");
  cached = JSON.parse(raw) as CurriculumPart[];
  return cached;
}

export { attachNoteIds, flattenCurriculum, noteIdFor } from "../curriculum";
