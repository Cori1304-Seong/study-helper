import React from "react";

/** useSearchParams를 쓰는 화면이 클라이언트에서 그려지기 전까지 보여줄 자리 */
export const ScreenFallback: React.FC<{ label: string }> = ({ label }) => (
  <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-500 font-mono text-sm">
    {label} 불러오는 중...
  </div>
);
