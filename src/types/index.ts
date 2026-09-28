/**
 * 3단계 메타인지 평가. 필기·섹션·문제 어디서나 같은 값을 쓴다.
 * unlearned=모름 / uncertain=헷갈림 / mastered=체화
 */
export type CardStatus = "unlearned" | "uncertain" | "mastered";

/** 진도율 요약 (헤더 표시용) */
export interface ProgressStats {
  total: number;
  mastered: number;
  uncertain: number;
  unlearned: number;
}
