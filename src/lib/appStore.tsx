"use client";

/**
 * 화면 전역 상태.
 *
 * 저장소가 둘로 나뉘어 있다 (PLANNING.md 원칙 4):
 *   - 필기·목차 → 파일(git). 거의 안 바뀌므로 서버에서 한 번 받아 들고 있는다.
 *   - 학습 상태 → PostgreSQL. 카드를 넘길 때마다 바뀌므로 낙관적으로 반영하고
 *     실패하면 되돌린다.
 *
 * 초기 데이터는 서버 컴포넌트(`(app)/layout.tsx`)가 직접 읽어 넘겨준다.
 * 그래서 첫 화면에 로딩 깜빡임이 없다.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { CardStatus, ProgressStats } from "../types";
import {
  CurriculumPart,
  DerivedQuestion,
  Note,
  NoteSectionProgress,
  QuestionProgress,
} from "../types/note";
import { deriveAllQuestions } from "./questions";
import { isDue, scheduleNext } from "./review";
import { flattenCurriculum } from "./curriculum";

export interface BootstrapData {
  notes: Note[];
  curriculum: CurriculumPart[];
  questionProgress: QuestionProgress[];
  sectionProgress: NoteSectionProgress[];
  notesWritable: boolean;
  databaseConfigured: boolean;
}

export interface TodaySummary {
  dueQuestions: number;
  freshQuestions: number;
  dueSections: number;
  totalQuestions: number;
  writtenItems: number;
  totalItems: number;
  nextItem?: { code: string; title: string; page: number };
  stats: ProgressStats;
}

interface AppStore {
  notes: Note[];
  noteById: Map<string, Note>;
  curriculum: CurriculumPart[];
  questions: DerivedQuestion[];
  questionsByNote: Map<string, DerivedQuestion[]>;
  questionProgress: Map<string, QuestionProgress>;
  sectionProgress: Map<string, NoteSectionProgress>;
  stats: ProgressStats;
  summary: TodaySummary;
  notesWritable: boolean;
  databaseConfigured: boolean;
  /** 저장 실패 등 사용자에게 알려야 하는 마지막 오류 */
  error: string | null;
  dismissError: () => void;
  rateQuestion: (questionId: string, status: CardStatus) => void;
  toggleSuppress: (questionId: string) => void;
  rateSection: (sectionId: string, status: CardStatus) => void;
  reload: () => Promise<void>;
}

const AppStoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({
  initial,
  children,
}: {
  initial: BootstrapData;
  children: React.ReactNode;
}) {
  const [notes, setNotes] = useState(initial.notes);
  const [curriculum, setCurriculum] = useState(initial.curriculum);
  const [notesWritable, setNotesWritable] = useState(initial.notesWritable);
  const [databaseConfigured, setDatabaseConfigured] = useState(
    initial.databaseConfigured,
  );
  const [error, setError] = useState<string | null>(null);

  const [questionProgress, setQuestionProgress] = useState(() =>
    toMap(initial.questionProgress, (p) => p.questionId),
  );
  const [sectionProgress, setSectionProgress] = useState(() =>
    toMap(initial.sectionProgress, (p) => p.sectionId),
  );

  // 문제는 저장하지 않는다. 필기가 바뀔 때마다 다시 파생시킨다.
  const questions = useMemo(() => deriveAllQuestions(notes), [notes]);

  const questionsByNote = useMemo(() => {
    const map = new Map<string, DerivedQuestion[]>();
    for (const q of questions) {
      const list = map.get(q.noteId) ?? [];
      list.push(q);
      map.set(q.noteId, list);
    }
    return map;
  }, [questions]);

  const noteById = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes]);

  const reload = useCallback(async () => {
    const res = await fetch("/api/bootstrap", { cache: "no-store" });
    if (!res.ok) {
      setError("데이터를 다시 불러오지 못했습니다.");
      return;
    }
    const data = (await res.json()) as BootstrapData;
    setNotes(data.notes);
    setCurriculum(data.curriculum);
    setNotesWritable(data.notesWritable);
    setDatabaseConfigured(data.databaseConfigured);
    setQuestionProgress(toMap(data.questionProgress, (p) => p.questionId));
    setSectionProgress(toMap(data.sectionProgress, (p) => p.sectionId));
  }, []);

  /** 낙관적으로 반영하고, 서버가 거절하면 이전 값으로 되돌린다. */
  const rateQuestion = useCallback(
    (questionId: string, status: CardStatus) => {
      const previous = questionProgress;
      const current = previous.get(questionId);
      const schedule = scheduleNext(status, current?.streak ?? 0);
      const updated: QuestionProgress = {
        questionId,
        status,
        reviewCount: (current?.reviewCount ?? 0) + 1,
        suppressed: current?.suppressed ?? false,
        ...schedule,
      };
      setQuestionProgress(new Map(previous).set(questionId, updated));

      // 간격은 서버가 다시 계산한다. 여기 값은 화면에 즉시 반영하기 위한 예측치.
      void post("/api/progress/questions", {
        id: questionId,
        status,
      }).catch((e: Error) => {
        setQuestionProgress(previous);
        setError(e.message);
      });
    },
    [questionProgress],
  );

  const toggleSuppress = useCallback(
    (questionId: string) => {
      const previous = questionProgress;
      const current = previous.get(questionId);
      const suppressed = !current?.suppressed;
      setQuestionProgress(
        new Map(previous).set(questionId, {
          questionId,
          status: current?.status ?? "unlearned",
          reviewCount: current?.reviewCount ?? 0,
          streak: current?.streak ?? 0,
          lastReviewedAt: current?.lastReviewedAt,
          nextReviewAt: current?.nextReviewAt,
          suppressed,
        }),
      );

      void post("/api/progress/questions", {
        id: questionId,
        suppressed,
      }).catch((e: Error) => {
        setQuestionProgress(previous);
        setError(e.message);
      });
    },
    [questionProgress],
  );

  const rateSection = useCallback(
    (sectionId: string, status: CardStatus) => {
      const previous = sectionProgress;
      const current = previous.get(sectionId);
      const schedule = scheduleNext(status, current?.streak ?? 0);
      const updated: NoteSectionProgress = {
        sectionId,
        status,
        reviewCount: (current?.reviewCount ?? 0) + 1,
        ...schedule,
      };
      setSectionProgress(new Map(previous).set(sectionId, updated));

      void post("/api/progress/sections", {
        id: sectionId,
        status,
      }).catch((e: Error) => {
        setSectionProgress(previous);
        setError(e.message);
      });
    },
    [sectionProgress],
  );

  // 숨긴 문제는 통계와 큐에서 모두 뺀다
  const liveQuestions = useMemo(
    () => questions.filter((q) => !questionProgress.get(q.id)?.suppressed),
    [questions, questionProgress],
  );

  const stats: ProgressStats = useMemo(() => {
    const statuses = liveQuestions
      .map((q) => questionProgress.get(q.id)?.status)
      .filter((s): s is CardStatus => !!s);
    return {
      total: statuses.length,
      mastered: statuses.filter((s) => s === "mastered").length,
      uncertain: statuses.filter((s) => s === "uncertain").length,
      unlearned: statuses.filter((s) => s === "unlearned").length,
    };
  }, [liveQuestions, questionProgress]);

  const summary: TodaySummary = useMemo(() => {
    const items = flattenCurriculum(curriculum);
    const nextItem = items.find((i) => !i.noteId);
    return {
      dueQuestions: liveQuestions.filter((q) => {
        const p = questionProgress.get(q.id);
        return !!p && isDue(p.nextReviewAt);
      }).length,
      freshQuestions: liveQuestions.filter((q) => !questionProgress.get(q.id))
        .length,
      dueSections: notes
        .flatMap((n) => n.sections)
        .filter((s) => isDue(sectionProgress.get(s.id)?.nextReviewAt)).length,
      totalQuestions: liveQuestions.length,
      writtenItems: items.filter((i) => i.noteId).length,
      totalItems: items.length,
      nextItem: nextItem
        ? { code: nextItem.code, title: nextItem.title, page: nextItem.page }
        : undefined,
      stats,
    };
  }, [
    curriculum,
    notes,
    liveQuestions,
    questionProgress,
    sectionProgress,
    stats,
  ]);

  const value = useMemo<AppStore>(
    () => ({
      notes,
      noteById,
      curriculum,
      questions,
      questionsByNote,
      questionProgress,
      sectionProgress,
      stats,
      summary,
      notesWritable,
      databaseConfigured,
      error,
      dismissError: () => setError(null),
      rateQuestion,
      toggleSuppress,
      rateSection,
      reload,
    }),
    [
      notes,
      noteById,
      curriculum,
      questions,
      questionsByNote,
      questionProgress,
      sectionProgress,
      stats,
      summary,
      notesWritable,
      databaseConfigured,
      error,
      rateQuestion,
      toggleSuppress,
      rateSection,
      reload,
    ],
  );

  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore(): AppStore {
  const store = useContext(AppStoreContext);
  if (!store)
    throw new Error("useAppStore는 AppStoreProvider 안에서만 쓸 수 있습니다.");
  return store;
}

function toMap<T>(items: T[], key: (item: T) => string): Map<string, T> {
  return new Map(items.map((i) => [key(i), i]));
}

async function post(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(data?.error ?? "저장에 실패했습니다.");
  }
}
