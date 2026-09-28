import { Suspense } from "react";
import type { Metadata } from "next";
import { CurriculumTree } from "../../../components/CurriculumTree";
import { ScreenFallback } from "../../../components/ScreenFallback";

export const metadata: Metadata = {
  title: "커리큘럼 · LinuxRecall",
};

/** 커리큘럼 — 목차 트리, 항별 필기 여부와 체화율 */
export default function CurriculumPage() {
  return (
    // CurriculumTree가 useSearchParams(?note=)를 읽으므로 경계가 필요하다
    <Suspense fallback={<ScreenFallback label="커리큘럼" />}>
      <CurriculumTree />
    </Suspense>
  );
}
