import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * 학습 상태만 DB에 둔다 (PLANNING.md 원칙 4, 7.2).
 *
 * 필기 내용은 `data/notes/*.json`이 원본이며 git으로 버전 관리된다.
 * 여기에는 문제/섹션의 **id로만** 연결되는 진도 기록이 들어간다.
 * 그래서 필기를 고쳐도 기록이 살아남고, git diff가 학습 로그로 오염되지 않는다.
 */

export const STATUSES = ["unlearned", "uncertain", "mastered"] as const;

/**
 * 파생 문제의 학습 상태.
 * question_id는 필기에서 결정론적으로 계산되는 id다.
 * 예) note-2-1-1-6/commands#groupadd#option--g
 */
export const questionProgress = pgTable(
  "question_progress",
  {
    questionId: text("question_id").primaryKey(),
    status: text("status", { enum: STATUSES }).notNull().default("unlearned"),
    reviewCount: integer("review_count").notNull().default(0),
    /** 연속 체화 횟수. Leitner 간격 산정에 쓴다. */
    streak: integer("streak").notNull().default(0),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    /** 오늘의 학습 큐 산정용 */
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
    /** 규칙이 쓸모없이 만들어낸 문제를 숨긴다 (기획서 4.2) */
    suppressed: boolean("suppressed").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // "오늘 복습할 것"을 매번 전체 스캔하지 않도록
    index("question_progress_next_review_idx").on(table.nextReviewAt),
    // 타입스크립트 enum은 런타임을 지켜주지 않는다. DB에서도 막는다.
    check(
      "question_progress_status_check",
      sql`${table.status} in ('unlearned', 'uncertain', 'mastered')`,
    ),
  ],
);

/** 백지 인출(섹션) 단위 학습 상태 */
export const sectionProgress = pgTable(
  "section_progress",
  {
    sectionId: text("section_id").primaryKey(),
    status: text("status", { enum: STATUSES }).notNull().default("unlearned"),
    reviewCount: integer("review_count").notNull().default(0),
    streak: integer("streak").notNull().default(0),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("section_progress_next_review_idx").on(table.nextReviewAt),
    check(
      "section_progress_status_check",
      sql`${table.status} in ('unlearned', 'uncertain', 'mastered')`,
    ),
  ],
);

export type QuestionProgressRow = typeof questionProgress.$inferSelect;
export type SectionProgressRow = typeof sectionProgress.$inferSelect;
