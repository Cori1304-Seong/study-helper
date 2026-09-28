import type { Metadata } from "next";
import { HomeToday } from "../../components/HomeToday";

export const metadata: Metadata = {
  title: "오늘의 학습 · LinuxRecall",
};

/** 홈 — 오늘의 학습 (PLANNING.md 6.3 / 8절) */
export default function HomePage() {
  return <HomeToday />;
}
