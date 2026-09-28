"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProgressStats } from "../types";
import { Home, ListTree, PenLine, Terminal, Zap } from "lucide-react";

interface HeaderProps {
  /** 오늘 복습 기한이 도래한 문제 수 — 탭에 배지로 노출 */
  dueCount: number;
  /** 문제 기준 체화도 */
  stats: ProgressStats;
}

const TABS: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: string;
}[] = [
  { href: "/", label: "오늘의 학습", icon: Home, active: "bg-emerald-600" },
  {
    href: "/curriculum",
    label: "커리큘럼",
    icon: ListTree,
    active: "bg-sky-600",
  },
  {
    href: "/recall",
    label: "백지 인출",
    icon: PenLine,
    active: "bg-violet-600",
  },
  { href: "/drill", label: "문제 풀이", icon: Zap, active: "bg-emerald-600" },
];

export const Header: React.FC<HeaderProps> = ({ dueCount, stats }) => {
  const pathname = usePathname();
  const { total, mastered, uncertain, unlearned } = stats;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <header className="no-print bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg border border-emerald-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-white tracking-tight">
                  LinuxRecall
                </h1>
                <span className="text-[11px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/30">
                  화면 데모
                </span>
              </div>
              <p className="text-xs text-slate-400">
                필기가 원본, 문제는 파생물
              </p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 self-start sm:self-auto">
            {TABS.map(({ href, label, icon: Icon, active }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? `${active} text-white shadow-sm`
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                  {href === "/drill" && dueCount > 0 && (
                    <span className="text-[10px] font-mono bg-black/30 px-1.5 rounded-full border border-white/10">
                      {dueCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* 문제 기준 체화도 */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">
              체화도 <span className="text-slate-500">(파생 문제 기준)</span>:
            </span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                체화 {mastered} ({pct(mastered)}%)
              </span>
              <span className="text-slate-600">/</span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                헷갈림 {uncertain}
              </span>
              <span className="text-slate-600">/</span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                모름 {unlearned}
              </span>
            </div>
          </div>

          <div className="w-full sm:w-48 h-2 bg-slate-800 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${pct(mastered)}%` }}
              className="bg-emerald-500 transition-all duration-300"
            />
            <div
              style={{ width: `${pct(uncertain)}%` }}
              className="bg-amber-500 transition-all duration-300"
            />
            <div
              style={{ width: `${pct(unlearned)}%` }}
              className="bg-rose-500 transition-all duration-300"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
