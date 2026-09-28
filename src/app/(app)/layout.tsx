import { readAllNotes, isNotesWritable } from "../../lib/server/notes";
import { attachNoteIds, readCurriculum } from "../../lib/server/curriculum";
import {
  getQuestionProgress,
  getSectionProgress,
} from "../../lib/server/progress";
import { isDatabaseConfigured } from "../../lib/db";
import { AppStoreProvider, BootstrapData } from "../../lib/appStore";
import { AppShell } from "../../components/AppShell";

/**
 * 학습 상태를 DB에서 읽으므로 절대 프리렌더하면 안 된다.
 * 이게 없으면 빌드 시점의 진도가 정적 HTML에 굳어버린다.
 * (레이아웃의 세그먼트 설정은 하위 페이지 전체에 적용된다)
 */
export const dynamic = "force-dynamic";

/**
 * 학습 화면 공통 레이아웃.
 *
 * 초기 데이터를 여기서 직접(HTTP 없이) 읽어 클라이언트 스토어에 넘긴다.
 * 그래서 첫 진입에 로딩 스피너가 없고, 탭을 옮겨도 이 레이아웃은 다시 실행되지
 * 않으므로 학습 상태가 유지된다.
 *
 * 로그인 화면은 이 레이아웃 바깥(`/login`)에 있어 DB 없이도 뜬다.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notes, curriculumRaw] = await Promise.all([
    readAllNotes(),
    readCurriculum(),
  ]);

  const curriculum = attachNoteIds(
    curriculumRaw,
    new Set(notes.map((n) => n.id)),
  );

  // DB가 아직 설정되지 않았어도 필기는 볼 수 있어야 한다
  const [questionProgress, sectionProgress] = isDatabaseConfigured
    ? await Promise.all([getQuestionProgress(), getSectionProgress()])
    : [[], []];

  const initial: BootstrapData = {
    notes,
    curriculum,
    questionProgress,
    sectionProgress,
    notesWritable: isNotesWritable,
    databaseConfigured: isDatabaseConfigured,
  };

  return (
    <AppStoreProvider initial={initial}>
      <AppShell>{children}</AppShell>
    </AppStoreProvider>
  );
}
