import "server-only";

import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { questionProgress, sectionProgress } from "../db/schema";
import { CardStatus } from "../../types";
import { NoteSectionProgress, QuestionProgress } from "../../types/note";
import { scheduleNext } from "../review";

/**
 * 학습 상태 조회/갱신. 유일하게 DB를 건드리는 곳이다.
 *
 * 문제 내용은 여기 없다. question_id / section_id로만 연결된다.
 */

const toIso = (d: Date | null) => d?.toISOString();

export async function getQuestionProgress(): Promise<QuestionProgress[]> {
  const rows = await db.select().from(questionProgress);
  return rows.map((r) => ({
    questionId: r.questionId,
    status: r.status,
    reviewCount: r.reviewCount,
    streak: r.streak,
    lastReviewedAt: toIso(r.lastReviewedAt),
    nextReviewAt: toIso(r.nextReviewAt),
    suppressed: r.suppressed,
  }));
}

export async function getSectionProgress(): Promise<NoteSectionProgress[]> {
  const rows = await db.select().from(sectionProgress);
  return rows.map((r) => ({
    sectionId: r.sectionId,
    status: r.status,
    reviewCount: r.reviewCount,
    streak: r.streak,
    lastReviewedAt: toIso(r.lastReviewedAt),
    nextReviewAt: toIso(r.nextReviewAt),
  }));
}

/**
 * 평가를 기록하고 다음 복습일을 정한다.
 *
 * 간격(Leitner)과 연속 체화 횟수는 **서버가 직접 계산한다.** 클라이언트가 보낸
 * 값을 믿으면 "체화했으니 30일 뒤"를 조작할 수 있고, 화면과 서버의 규칙이
 * 갈라질 여지도 생긴다. 클라이언트는 같은 함수로 낙관적 표시만 한다.
 */
function nextValues(
  status: CardStatus,
  current?: { streak: number; reviewCount: number },
) {
  const schedule = scheduleNext(status, current?.streak ?? 0);
  return {
    status,
    reviewCount: (current?.reviewCount ?? 0) + 1,
    streak: schedule.streak,
    lastReviewedAt: new Date(schedule.lastReviewedAt),
    nextReviewAt: new Date(schedule.nextReviewAt),
    updatedAt: new Date(),
  };
}

export async function rateQuestion(
  id: string,
  status: CardStatus,
): Promise<void> {
  const [current] = await db
    .select()
    .from(questionProgress)
    .where(eq(questionProgress.questionId, id));
  const next = nextValues(status, current);

  await db
    .insert(questionProgress)
    .values({ questionId: id, ...next })
    .onConflictDoUpdate({ target: questionProgress.questionId, set: next });
}

export async function rateSection(
  id: string,
  status: CardStatus,
): Promise<void> {
  const [current] = await db
    .select()
    .from(sectionProgress)
    .where(eq(sectionProgress.sectionId, id));
  const next = nextValues(status, current);

  await db
    .insert(sectionProgress)
    .values({ sectionId: id, ...next })
    .onConflictDoUpdate({ target: sectionProgress.sectionId, set: next });
}

/** 쓸모없이 생성된 문제 숨김 토글 (기획서 4.2) */
export async function setQuestionSuppressed(
  questionId: string,
  suppressed: boolean,
): Promise<void> {
  await db
    .insert(questionProgress)
    .values({ questionId, suppressed, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: questionProgress.questionId,
      set: { suppressed, updatedAt: new Date() },
    });
}

/**
 * 필기를 지웠을 때 남는 고아 기록을 정리한다.
 * 필기가 원본이므로 기록만 덩그러니 남으면 통계가 틀어진다.
 */
export async function deleteProgressForSections(
  sectionIds: string[],
  questionIds: string[],
): Promise<void> {
  if (sectionIds.length > 0)
    await db
      .delete(sectionProgress)
      .where(inArray(sectionProgress.sectionId, sectionIds));
  if (questionIds.length > 0)
    await db
      .delete(questionProgress)
      .where(inArray(questionProgress.questionId, questionIds));
}
