"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookMarked,
  CalendarClock,
  CheckCircle2,
  PenLine,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { countDerived } from "../lib/questions";
import { useAppStore } from "../lib/appStore";

export const HomeToday: React.FC = () => {
  const { summary, notes } = useAppStore();
  const { stats } = summary;

  const recentNotes = React.useMemo(
    () =>
      [...notes]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 3),
    [notes],
  );
  const rated = stats.mastered + stats.uncertain + stats.unlearned;
  const pct = (n: number) => (rated > 0 ? Math.round((n / rated) * 100) : 0);
  const writePct =
    summary.totalItems > 0
      ? Math.round((summary.writtenItems / summary.totalItems) * 100)
      : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-white tracking-tight">
          오늘의 학습
        </h2>
        <p className="text-xs text-slate-400 mt-1 break-keep">
          기한 도래분을 먼저 비우고, 남으면 새 항을 필기한다. 이것이 지속 학습의
          기본 루프다.
        </p>
      </div>

      {/* 오늘의 학습 큐 */}
      <div className="grid gap-3 sm:grid-cols-2">
        <QueueCard
          tone="emerald"
          icon={<CalendarClock className="w-4 h-4" />}
          label="오늘 복습할 문제"
          count={summary.dueQuestions}
          hint="복습 기한이 도래한 파생 문제"
          action="복습 시작"
          href="/drill?filter=due"
        />
        <QueueCard
          tone="sky"
          icon={<Sparkles className="w-4 h-4" />}
          label="처음 푸는 문제"
          count={summary.freshQuestions}
          hint="필기에서 새로 파생되어 아직 안 푼 문제"
          action="풀어보기"
          href="/drill?filter=fresh"
        />
        <QueueCard
          tone="violet"
          icon={<PenLine className="w-4 h-4" />}
          label="백지 인출할 섹션"
          count={summary.dueSections}
          hint="섹션 제목만 보고 전부 재구성"
          action="인출 시작"
          href="/recall?due=1"
        />
        <QueueCard
          tone="amber"
          icon={<BookMarked className="w-4 h-4" />}
          label="새로 필기할 항"
          count={summary.nextItem ? 1 : 0}
          hint={
            summary.nextItem
              ? `${summary.nextItem.code} ${summary.nextItem.title} (p.${summary.nextItem.page})`
              : "모든 항의 필기를 마쳤습니다"
          }
          action="커리큘럼에서 열기"
          href="/curriculum"
        />
      </div>

      {/* 진도 & 체화도 */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <BookMarked className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-slate-300">
              필기 진도
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className="text-2xl font-bold text-white">
              {summary.writtenItems}
            </span>
            <span className="text-sm text-slate-500">
              / {summary.totalItems}항
            </span>
            <span className="ml-auto text-xs text-amber-300">{writePct}%</span>
          </div>
          <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              style={{ width: `${writePct}%` }}
              className="h-full bg-amber-500 transition-all"
            />
          </div>
          <p className="mt-2.5 text-[11px] text-slate-500 break-keep">
            필기 {summary.writtenItems}개에서 문제{" "}
            <strong className="text-slate-300 font-mono">
              {summary.totalQuestions}
            </strong>
            개가 파생되었습니다.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-300">
              문제 체화도
            </span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${pct(stats.mastered)}%` }}
              className="bg-emerald-500"
            />
            <div
              style={{ width: `${pct(stats.uncertain)}%` }}
              className="bg-amber-500"
            />
            <div
              style={{ width: `${pct(stats.unlearned)}%` }}
              className="bg-rose-500"
            />
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center font-mono">
            <Metric
              tone="text-emerald-300"
              dot="bg-emerald-500"
              label="⭕ 체화"
              value={stats.mastered}
            />
            <Metric
              tone="text-amber-300"
              dot="bg-amber-500"
              label="🔺 헷갈림"
              value={stats.uncertain}
            />
            <Metric
              tone="text-rose-300"
              dot="bg-rose-500"
              label="❌ 모름"
              value={stats.unlearned}
            />
          </dl>
        </div>
      </div>

      {/* 최근 필기 */}
      <div className="mt-6">
        <h3 className="text-xs font-semibold text-slate-300 mb-2.5">
          최근에 쓴 필기
        </h3>
        <div className="space-y-2">
          {recentNotes.map((note) => {
            const { sections, questions } = countDerived(note);
            return (
              <Link
                key={note.id}
                href={`/curriculum?note=${note.id}`}
                className="block w-full text-left bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl px-3.5 py-3 transition group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {note.book.item}
                  </span>
                  <span className="text-sm font-bold text-white truncate">
                    {note.title}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400 ml-auto shrink-0 transition" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed break-keep">
                  {note.summary}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-slate-500">
                  <span>섹션 {sections}</span>
                  <span className="text-slate-700">|</span>
                  <span className="text-emerald-400">
                    파생 문제 {questions}
                  </span>
                  <span className="text-slate-700">|</span>
                  <span>p.{note.book.page}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <p className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-slate-600">
        <CheckCircle2 className="w-3 h-3" />
        데모 화면입니다. 평가 결과는 새로고침하면 초기화됩니다.
      </p>
    </div>
  );
};

const TONES = {
  emerald: {
    ring: "hover:border-emerald-500/50",
    icon: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    num: "text-emerald-300",
    btn: "bg-emerald-600 hover:bg-emerald-500 text-white",
  },
  sky: {
    ring: "hover:border-sky-500/50",
    icon: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    num: "text-sky-300",
    btn: "bg-sky-600 hover:bg-sky-500 text-white",
  },
  violet: {
    ring: "hover:border-violet-500/50",
    icon: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    num: "text-violet-300",
    btn: "bg-violet-600 hover:bg-violet-500 text-white",
  },
  amber: {
    ring: "hover:border-amber-500/50",
    icon: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    num: "text-amber-300",
    btn: "bg-amber-600 hover:bg-amber-500 text-white",
  },
} as const;

const QueueCard: React.FC<{
  tone: keyof typeof TONES;
  icon: React.ReactNode;
  label: string;
  count: number;
  hint: string;
  action: string;
  href: string;
}> = ({ tone, icon, label, count, hint, action, href }) => {
  const t = TONES[tone];
  const disabled = count === 0;
  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col transition ${t.ring}`}
    >
      <div className="flex items-start gap-2.5">
        <span className={`p-2 rounded-lg border shrink-0 ${t.icon}`}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-semibold text-slate-300">
              {label}
            </span>
            <span className={`text-xl font-bold font-mono ml-auto ${t.num}`}>
              {count}
              <span className="text-xs text-slate-500 ml-0.5">개</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed break-keep">
            {hint}
          </p>
        </div>
      </div>
      {disabled ? (
        <span
          className={`mt-3 w-full flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold opacity-30 cursor-not-allowed ${t.btn}`}
        >
          {action}
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      ) : (
        <Link
          href={href}
          className={`mt-3 w-full flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition active:scale-[0.98] ${t.btn}`}
        >
          {action}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
};

const Metric: React.FC<{
  tone: string;
  dot: string;
  label: string;
  value: number;
}> = ({ tone, dot, label, value }) => (
  <div className="bg-slate-950/60 border border-slate-800 rounded-xl py-2">
    <dt className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </dt>
    <dd className={`text-base font-bold mt-0.5 ${tone}`}>{value}</dd>
  </div>
);
