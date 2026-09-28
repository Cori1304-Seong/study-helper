"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Terminal, LoaderCircle } from "lucide-react";

/** 사용자 1명 전제의 단일 비밀번호 로그인 */
export const LoginForm: React.FC = () => {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      // 서버 컴포넌트가 새 쿠키로 다시 렌더링되도록 갱신한다
      router.replace(next);
      router.refresh();
      return;
    }

    const data = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    setError(data?.error ?? "로그인에 실패했습니다.");
    setPending(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6"
      >
        <div className="flex items-center gap-2.5 mb-5">
          <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg border border-emerald-500/20">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-tight">
              LinuxRecall
            </h1>
            <p className="text-xs text-slate-400">필기가 원본, 문제는 파생물</p>
          </div>
        </div>

        <label
          htmlFor="password"
          className="block text-xs font-semibold text-slate-300 mb-1.5"
        >
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />

        {error && (
          <p className="mt-2 text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-lg px-2.5 py-1.5">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !password}
          className="mt-4 w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold py-2 rounded-lg transition"
        >
          {pending && <LoaderCircle className="w-4 h-4 animate-spin" />}
          들어가기
        </button>
      </form>
    </div>
  );
};
