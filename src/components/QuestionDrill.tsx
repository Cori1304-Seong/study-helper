"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Keyboard,
  NotebookPen,
  Shuffle,
  Sparkles,
  XCircle,
} from "lucide-react";
import { CardStatus } from "../types";
import { maskConfigBody, questionKindLabel } from "../lib/questions";
import { STATUS_META, formatDue, isDue } from "../lib/review";
import { useAppStore } from "../lib/appStore";

export type DrillFilter = "all" | "due" | "fresh" | "weak";

const FILTERS: { id: DrillFilter; label: string }[] = [
  { id: "due", label: "기한 도래분" },
  { id: "fresh", label: "처음 푸는 문제" },
  { id: "weak", label: "🔺헷갈림 + ❌모름" },
  { id: "all", label: "전체" },
];

const isDrillFilter = (v: string | null): v is DrillFilter =>
  v === "all" || v === "due" || v === "fresh" || v === "weak";

export const QuestionDrill: React.FC = () => {
  const {
    questions,
    notes,
    questionProgress: progress,
    rateQuestion: onRate,
    toggleSuppress: onToggleSuppress,
  } = useAppStore();
  const params = useSearchParams();

  // /drill?filter=due&note=note-2-1-1-6 으로 진입 지점을 지정할 수 있다
  const [filter, setFilter] = useState<DrillFilter>(() => {
    const v = params.get("filter");
    return isDrillFilter(v) ? v : "due";
  });
  const [noteFilter, setNoteFilter] = useState(
    () => params.get("note") ?? "all",
  );
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showSuppressed, setShowSuppressed] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const pool = useMemo(() => {
    let list = questions;
    if (noteFilter !== "all")
      list = list.filter((q) => q.noteId === noteFilter);
    if (!showSuppressed)
      list = list.filter((q) => !progress.get(q.id)?.suppressed);

    if (filter === "due")
      list = list.filter((q) => {
        const p = progress.get(q.id);
        return !!p && isDue(p.nextReviewAt);
      });
    else if (filter === "fresh") list = list.filter((q) => !progress.get(q.id));
    else if (filter === "weak")
      list = list.filter((q) => {
        const s = progress.get(q.id)?.status;
        return s === "unlearned" || s === "uncertain";
      });

    if (shuffleSeed > 0) {
      list = [...list].sort(
        (a, b) =>
          hash(`${a.id}:${shuffleSeed}`) - hash(`${b.id}:${shuffleSeed}`),
      );
    }
    return list;
  }, [questions, noteFilter, showSuppressed, filter, progress, shuffleSeed]);

  // 필터가 바뀌면 처음부터 다시 — key 리셋 대신 안전하게 범위만 보정
  const safeIndex = Math.min(index, Math.max(0, pool.length - 1));
  const current = pool[safeIndex];

  const go = useCallback(
    (delta: number) => {
      setIndex((prev) => Math.max(0, Math.min(prev + delta, pool.length - 1)));
      setRevealed(false);
    },
    [pool.length],
  );

  const handleRate = useCallback(
    (status: CardStatus) => {
      if (!current) return;
      onRate(current.id, status);
      setRevealed(false);
      setIndex((prev) => Math.min(prev + 1, pool.length - 1));
    },
    [current, onRate, pool.length],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName,
        )
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        setRevealed((v) => !v);
      } else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "1") handleRate("unlearned");
      else if (e.key === "2") handleRate("uncertain");
      else if (e.key === "3") handleRate("mastered");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [go, handleRate]);

  const changeFilter = (next: DrillFilter) => {
    setFilter(next);
    setIndex(0);
    setRevealed(false);
  };

  const p = current ? progress.get(current.id) : undefined;
  const meta = STATUS_META[p?.status ?? "unlearned"];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-44 sm:pb-24">
      {/* 필터 바 */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">필기:</span>
            <select
              value={noteFilter}
              onChange={(e) => {
                setNoteFilter(e.target.value);
                setIndex(0);
                setRevealed(false);
              }}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium max-w-56"
            >
              <option value="all">전체 필기</option>
              {notes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.book.item} {n.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setShowSuppressed((v) => !v)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition font-medium ${
                showSuppressed
                  ? "bg-slate-700 text-white border-slate-600"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
              }`}
            >
              {showSuppressed ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
              숨긴 문제
            </button>
            <button
              onClick={() => {
                setShuffleSeed(Date.now());
                setIndex(0);
                setRevealed(false);
              }}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/80 px-2.5 py-1.5 rounded-lg transition font-medium"
            >
              <Shuffle className="w-3.5 h-3.5 text-emerald-400" />
              셔플
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => changeFilter(f.id)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition border ${
                filter === f.id
                  ? "bg-emerald-600 text-white border-emerald-500 font-bold"
                  : "bg-slate-800/50 text-slate-400 border-transparent hover:text-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {!current ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center">
          <Sparkles className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">
            조건에 해당하는 문제가 없습니다
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            오늘 할 몫을 다 비웠거나, 다른 필터를 골라야 합니다.
          </p>
          <button
            onClick={() => changeFilter("all")}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700"
          >
            전체 문제 보기
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 px-1">
            <span className="font-mono">
              <strong className="text-white">{safeIndex + 1}</strong> /{" "}
              {pool.length}
            </span>
            <span className="text-[11px] text-slate-500 items-center gap-1 hidden sm:flex">
              <Keyboard className="w-3 h-3" />
              Space 공개 | 1·2·3 평가 | ←→ 이동
            </span>
          </div>

          {/* 문제 카드 */}
          <div
            onClick={() => !revealed && setRevealed(true)}
            className={`bg-slate-900 border-2 rounded-3xl p-5 sm:p-7 transition-all shadow-xl ${
              revealed ? "cursor-default" : "cursor-pointer"
            } ${
              p?.status === "mastered"
                ? "border-emerald-500/40"
                : p?.status === "uncertain"
                  ? "border-amber-500/40"
                  : "border-slate-800 hover:border-slate-700"
            }`}
          >
            {/* 출처 & 유형 */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {current.noteTitle}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/60 text-slate-400 border border-slate-700/60">
                  {current.sectionTitle}
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  {questionKindLabel(current.kind)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-slate-500">
                  {formatDue(p?.nextReviewAt)}
                </span>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${meta.bg} ${meta.text} ${meta.border}`}
                >
                  {meta.emoji} {meta.label}
                  {p ? ` ·${p.reviewCount}회` : ""}
                </span>
              </div>
            </div>

            {/* 질문 */}
            <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed tracking-tight break-keep">
              {current.prompt}
            </h2>

            {/* 빈칸형은 가려진 원문을 함께 보여준다 */}
            {current.kind === "blank" && current.configBody && (
              <pre className="mt-3 bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
                {revealed
                  ? current.configBody
                  : maskConfigBody(current.configBody, current.answer)}
              </pre>
            )}

            {revealed ? (
              <div className="mt-6 pt-5 border-t border-slate-800/80">
                <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400 flex items-center gap-1 mb-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 정답
                </span>

                {current.answerList ? (
                  <ol className="bg-slate-950 rounded-xl p-4 border border-emerald-500/30 space-y-1.5">
                    {current.answerList.map((line) => (
                      <li
                        key={line}
                        className="text-xs sm:text-sm font-mono text-emerald-300 leading-relaxed break-all"
                      >
                        {line}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="bg-slate-950 rounded-xl p-4 border border-emerald-500/30 font-mono text-sm sm:text-base text-emerald-300 whitespace-pre-wrap leading-relaxed break-all">
                    {current.answer}
                  </div>
                )}

                {/* 필기의 상세 설명. 틀린 직후가 읽기 가장 좋은 타이밍이다. */}
                {current.detail && (
                  <div className="mt-3 bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5">
                    <span className="flex items-center gap-1 text-[11px] font-bold text-sky-300 mb-1.5">
                      <NotebookPen className="w-3.5 h-3.5" />
                      필기 메모
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-keep">
                      {current.detail}
                    </p>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <code className="text-[10px] text-slate-600 font-mono break-all">
                    id: {current.id}
                  </code>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSuppress(current.id);
                    }}
                    className="ml-auto flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-300 transition"
                  >
                    <EyeOff className="w-3 h-3" />
                    {p?.suppressed ? "숨김 해제" : "쓸모없는 문제 숨기기"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 py-7 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center group hover:border-slate-700 transition">
                <Eye className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 mb-1.5 transition" />
                <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200 transition">
                  머릿속으로 먼저 인출한 뒤 탭하세요
                </span>
              </div>
            )}
          </div>

          {/* 이동 */}
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              onClick={() => go(-1)}
              disabled={safeIndex === 0}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 text-xs font-semibold transition"
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </button>
            <button
              onClick={() => setRevealed((v) => !v)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/80 transition"
            >
              {revealed ? "정답 가리기" : "정답 확인 (Space)"}
            </button>
            <button
              onClick={() => go(1)}
              disabled={safeIndex >= pool.length - 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 text-xs font-semibold transition"
            >
              다음
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 3단계 평가 — 모바일에서는 하단 고정 액션바 */}
          <div className="fixed sm:static bottom-0 inset-x-0 z-30 bg-slate-950/95 sm:bg-transparent border-t sm:border-0 border-slate-800 backdrop-blur px-4 py-3 sm:p-0 sm:mt-5">
            <div className="max-w-3xl mx-auto grid grid-cols-3 gap-2 sm:gap-3">
              <RateButton
                icon={<XCircle className="w-4 h-4" />}
                label="❌ 모름"
                shortcut="1"
                tone="rose"
                onClick={() => handleRate("unlearned")}
              />
              <RateButton
                icon={<AlertCircle className="w-4 h-4" />}
                label="🔺 헷갈림"
                shortcut="2"
                tone="amber"
                onClick={() => handleRate("uncertain")}
              />
              <RateButton
                icon={<CheckCircle2 className="w-4 h-4" />}
                label="⭕ 체화"
                shortcut="3"
                tone="emerald"
                onClick={() => handleRate("mastered")}
              />
            </div>
            <p className="max-w-3xl mx-auto mt-2 text-center text-[10px] text-slate-600">
              평가하면 Leitner 간격(모름 +1일 / 헷갈림 +3일 / 체화 +7·14·30일)에
              따라 다음 복습일이 정해집니다.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

const TONES = {
  rose: "bg-rose-950/40 hover:bg-rose-900/50 border-rose-500/30 text-rose-300",
  amber:
    "bg-amber-950/40 hover:bg-amber-900/50 border-amber-500/30 text-amber-300",
  emerald:
    "bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/30 text-emerald-300",
} as const;

const RateButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  shortcut: string;
  tone: keyof typeof TONES;
  onClick: () => void;
}> = ({ icon, label, shortcut, tone, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 px-2 rounded-xl border transition active:scale-95 ${TONES[tone]}`}
  >
    {icon}
    <span className="text-xs sm:text-sm font-bold">{label}</span>
    <kbd className="hidden sm:inline-block text-[10px] bg-black/30 px-1.5 py-0.5 rounded border border-white/10">
      {shortcut}
    </kbd>
  </button>
);

/** 셔플용 결정론적 해시 */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
