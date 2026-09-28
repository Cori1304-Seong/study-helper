/**
 * 개정 2판 기획서(PLANNING.md) 기반 필기 모델.
 * 필기가 유일한 원본이고 문제는 저장하지 않고 매번 파생시킨다.
 *
 * NOTE: 현재는 화면 데모 단계라 실제 저장소(파일/Supabase) 연결 없이
 *       `src/lib/demo/*`의 목업 데이터로만 채운다.
 */

import { CardStatus } from "./index";

/** 교재 서술 패턴에서 도출한 섹션 종류 (기획서 3.2) */
export type NoteSectionKind =
  | "overview"
  | "command"
  | "file"
  | "config"
  | "steps";

/**
 * `detail`은 문제로 만들지 않는다. `overview` 섹션과 같은 취급이다.
 *
 * 인출 단서(`desc`, `meaning`)를 짧게 유지하면서 깊은 내용을 따로 쌓기 위한 자리다.
 * 단서 칸에 주의사항·원리를 밀어넣으면 문제 프롬프트가 부풀고 인출 단서로서
 * 쓸모없어진다. 예) "-p → 비밀번호 저장(암호화 안 되니 사용 지양)"
 *
 * 줄바꿈만 살리는 일반 텍스트다. 마크다운으로 렌더링하지 않는다.
 */

/** 옵션을 자유 문자열이 아닌 쌍으로 쪼갠다. 그래야 옵션 하나하나가 문제가 된다. */
export interface NoteOption {
  flag: string;
  meaning: string; // 짧게. 옵션형 문제의 인출 단서가 된다.
  detail?: string; // 상세. 문제로 만들지 않는다.
}

export interface NoteItem {
  term: string; // groupadd, /etc/group
  desc: string; // 한 줄 의미. 서로 구별되게 써야 역방향 문제의 답이 하나로 떨어진다.
  options?: NoteOption[]; // kind === "command"
  format?: string; // kind === "file" — 필드 포맷
  detail?: string; // 상세(원리·주의점·실무 맥락). 문제로 만들지 않는다.
}

export interface NoteSection {
  id: string; // "note-2-1-1-6/commands" — 파생 문제 id의 접두어
  title: string;
  kind: NoteSectionKind;
  items?: NoteItem[]; // command | file | steps
  body?: string; // overview | config
  path?: string; // config — 설정 파일 경로
  blanks?: string[]; // config — 이 토큰이 빈칸이 된다
}

export interface NoteBookRef {
  part: number;
  chapter: number;
  section: string; // "1.1"
  item: string; // "1.1.6"
  page: number;
}

/** 필기 1개 = 교재의 항 1개 */
export interface Note {
  id: string; // "note-2-1-1-6"
  title: string;
  book: NoteBookRef;
  summary: string;
  tags: string[];
  sections: NoteSection[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 교재 목차 트리 — 필기하지 않은 항도 목록에 있어야 진도가 나온다
// ---------------------------------------------------------------------------

export interface CurriculumItem {
  code: string; // "1.1.6"
  title: string; // "그룹 관리"
  page: number;
  noteId?: string; // 필기가 존재하면 연결된다
}

export interface CurriculumSection {
  code: string; // "1.1"
  title: string; // "사용자 관리"
  page: number;
  items: CurriculumItem[];
}

export interface CurriculumChapter {
  code: string; // "01"
  title: string; // "일반 운영 관리"
  sections: CurriculumSection[];
}

export interface CurriculumPart {
  code: string; // "Part02"
  title: string;
  chapters: CurriculumChapter[];
}

// ---------------------------------------------------------------------------
// 파생 문제 (저장하지 않는다. 필기에서 매번 만들어낸다)
// ---------------------------------------------------------------------------

export type QuestionKind =
  | "enumerate"
  | "recall-term"
  | "recall-desc"
  | "option"
  | "format"
  | "blank"
  | "order";

export interface DerivedQuestion {
  /** 결정론적 id — 섹션id + term + 문제유형 (기획서 원칙 3) */
  id: string;
  noteId: string;
  noteTitle: string;
  sectionId: string;
  sectionTitle: string;
  kind: QuestionKind;
  prompt: string;
  /** 한 줄 정답 */
  answer: string;
  /** 열거형·순서형처럼 여러 줄인 정답 */
  answerList?: string[];
  /** 빈칸형에서 가려진 원문을 그대로 보여주기 위한 설정 원문 */
  configBody?: string;
  configPath?: string;
  /**
   * 필기의 상세 설명. **문제를 만드는 데는 쓰이지 않는다.**
   * 정답을 공개한 뒤 보여주는 해설 용도라 id에도 영향을 주지 않는다.
   */
  detail?: string;
}

/** 문제 단위 학습 상태 (기획서 7.2 question_progress) */
export interface QuestionProgress {
  questionId: string;
  status: CardStatus;
  reviewCount: number;
  streak: number; // 연속 체화 횟수
  lastReviewedAt?: string;
  nextReviewAt?: string;
  suppressed: boolean; // 쓸모없이 생성된 문제 숨김
}

/** 섹션(백지 인출) 단위 학습 상태 */
export interface NoteSectionProgress {
  sectionId: string;
  status: CardStatus;
  reviewCount: number;
  streak: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
}

export type DemoView = "home" | "curriculum" | "recall" | "drill";
