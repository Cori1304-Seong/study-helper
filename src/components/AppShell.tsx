"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { Header } from "./Header";
import { useAppStore } from "../lib/appStore";

/** 모든 학습 화면이 공유하는 껍데기 */
export const AppShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const {
    stats,
    summary,
    databaseConfigured,
    notesWritable,
    error,
    dismissError,
  } = useAppStore();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Header dueCount={summary.dueQuestions} stats={stats} />

      {!databaseConfigured && (
        <div className="no-print bg-rose-950/50 border-b border-rose-500/30 text-rose-200 text-xs text-center py-2 px-4 break-keep">
          DATABASE_URL이 설정되지 않아 학습 상태가 저장되지 않습니다.
          <code className="font-mono mx-1">.env.example</code>을 참고해
          <code className="font-mono mx-1">.env.local</code>을 만들어주세요.
        </div>
      )}

      {!notesWritable && (
        <div className="no-print bg-slate-900 border-b border-slate-800 text-slate-400 text-xs text-center py-1.5 px-4 break-keep">
          배포 환경이라 필기는 읽기 전용입니다. 수정은 로컬에서 하고
          커밋·푸시하세요.
        </div>
      )}

      {error && (
        <div className="no-print bg-rose-950/60 border-b border-rose-500/40 text-rose-200 text-xs py-2 px-4 flex items-center justify-center gap-3">
          <span className="break-keep">{error}</span>
          <button
            onClick={dismissError}
            className="shrink-0 hover:text-white transition"
            aria-label="오류 닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <main className="flex-1">{children}</main>

      <footer className="no-print border-t border-slate-900 bg-slate-950/80 py-4 text-xs text-slate-500 font-mono">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>LinuxRecall • 필기 → 자동 파생 문제 → 간격 반복</span>
          <div className="flex items-center gap-4">
            <span className="text-slate-600 hidden sm:inline">
              [Space] 공개 | [1·2·3] 평가 | [← →] 이동
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1 hover:text-slate-300 transition"
            >
              <LogOut className="w-3 h-3" />
              로그아웃
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
