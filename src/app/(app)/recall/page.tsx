import { Suspense } from "react";
import type { Metadata } from "next";
import { BlankRecall } from "../../../components/BlankRecall";
import { ScreenFallback } from "../../../components/ScreenFallback";

export const metadata: Metadata = {
  title: "백지 인출 · LinuxRecall",
};

/** 백지 인출 — 섹션 제목과 항목 개수만 보고 전부 재구성 */
export default function RecallPage() {
  return (
    <Suspense fallback={<ScreenFallback label="백지 인출" />}>
      <BlankRecall />
    </Suspense>
  );
}
