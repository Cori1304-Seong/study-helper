import { CardStatus } from "../types";

/**
 * 간격 반복 (PLANNING.md 6.2) — 단순 Leitner.
 * SM-2는 도입하지 않는다.
 */

const DAY = 24 * 60 * 60 * 1000;

/** 평가 결과와 연속 체화 횟수로 다음 복습까지의 일수를 정한다. */
export function intervalDays(status: CardStatus, streak: number): number {
  if (status === "unlearned") return 1;
  if (status === "uncertain") return 3;
  if (streak >= 3) return 30;
  if (streak === 2) return 14;
  return 7;
}

export function nextStreak(status: CardStatus, streak: number): number {
  return status === "mastered" ? streak + 1 : 0;
}

export function scheduleNext(
  status: CardStatus,
  previousStreak: number,
  now = new Date(),
) {
  const streak = nextStreak(status, previousStreak);
  return {
    streak,
    lastReviewedAt: now.toISOString(),
    nextReviewAt: new Date(
      now.getTime() + intervalDays(status, streak) * DAY,
    ).toISOString(),
  };
}

export function isDue(nextReviewAt: string | undefined, now = new Date()) {
  if (!nextReviewAt) return true; // 한 번도 안 본 것은 항상 대상
  return new Date(nextReviewAt).getTime() <= now.getTime();
}

/** "3일 후", "오늘", "2일 지남" 같은 사람이 읽는 표기 */
export function formatDue(nextReviewAt: string | undefined, now = new Date()) {
  if (!nextReviewAt) return "미학습";
  const diff = Math.round(
    (new Date(nextReviewAt).getTime() - now.getTime()) / DAY,
  );
  if (diff < 0) return `${-diff}일 지남`;
  if (diff === 0) return "오늘";
  return `${diff}일 후`;
}

export const STATUS_META: Record<
  CardStatus,
  { label: string; emoji: string; text: string; bg: string; border: string }
> = {
  unlearned: {
    label: "모름",
    emoji: "❌",
    text: "text-rose-300",
    bg: "bg-rose-950/40",
    border: "border-rose-500/30",
  },
  uncertain: {
    label: "헷갈림",
    emoji: "🔺",
    text: "text-amber-300",
    bg: "bg-amber-950/40",
    border: "border-amber-500/30",
  },
  mastered: {
    label: "체화",
    emoji: "⭕",
    text: "text-emerald-300",
    bg: "bg-emerald-950/40",
    border: "border-emerald-500/30",
  },
};
