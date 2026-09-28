import { Suspense } from "react";
import type { Metadata } from "next";
import { QuestionDrill } from "../../../components/QuestionDrill";
import { ScreenFallback } from "../../../components/ScreenFallback";

export const metadata: Metadata = {
  title: "문제 풀이 · LinuxRecall",
};

/** 문제 풀이 — 파생 문제 1개씩 인출 */
export default function DrillPage() {
  return (
    <Suspense fallback={<ScreenFallback label="문제 풀이" />}>
      <QuestionDrill />
    </Suspense>
  );
}
