<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# LinuxRecall

기획서는 `PLANNING.md`(개정 2판). **필기가 원본이고 문제는 파생물**이다.

## 데이터 저장 구조 (중요)

쓰기 성격이 정반대인 두 데이터를 분리한다. 하나로 합치지 말 것.

| 데이터                   | 위치                            | 쓰기 가능 환경       |
| ------------------------ | ------------------------------- | -------------------- |
| 교재 목차 트리           | `data/curriculum.json` (git)    | 로컬                 |
| 필기 (항 1개 = 파일 1개) | `data/notes/{id}.json` (git)    | 로컬 `next dev` 전용 |
| 문제·섹션 학습 상태      | PostgreSQL (로컬) / Neon (배포) | 어디서나             |

- 학습 상태를 파일에 두면 문제 한 장 넘길 때마다 git 히스토리가 오염된다.
- 필기를 DB에 넣으면 git diff·리뷰·롤백을 잃는다.
- 배포 환경(Vercel)은 런타임 FS가 읽기 전용이라 필기 수정 API가 403을 준다
  (`isNotesWritable`). 필기 추가는 로컬 작성 → 커밋 → 푸시 → 재배포.

### 파생 문제는 저장하지 않는다

`src/lib/questions.ts`가 필기에서 매번 만들어낸다. 문제 id는
`섹션id + term + 문제유형`으로 결정론적이라 필기를 고쳐도 학습 기록이 살아남는다.
**섹션 id는 한 번 정하면 바꾸지 말 것** — 바꾸면 그 섹션의 기록이 전부 끊긴다.

필기에서 섹션을 지우면 `PUT /api/notes/[id]`가 고아가 된 진도 기록을 함께 지운다.

## 구조

```
src/app/(app)/        학습 화면 4종 + 필기 편집. layout이 초기 데이터를 서버에서 읽어 넘긴다
src/app/login/        단일 비밀번호 로그인 (게이트 바깥)
src/app/api/          bootstrap / notes / progress / auth
src/proxy.ts          인증 게이트. Next 16에서 middleware.ts → proxy.ts로 이름이 바뀌었다
src/lib/appStore.tsx  클라이언트 전역 상태. 낙관적 업데이트 + 실패 시 롤백
src/lib/server/       파일·DB에 직접 닿는 코드 (클라이언트에서 import 금지)
src/lib/db/           Drizzle 스키마와 커넥션
```

`(app)/layout.tsx`에 `export const dynamic = "force-dynamic"`이 **반드시** 있어야 한다.
없으면 빌드 시점의 진도가 정적 HTML에 굳는다.

## 로컬 개발

```bash
# PostgreSQL 기동 (brew services가 깨져 있어 pg_ctl을 직접 쓴다)
pg_ctl -D /opt/homebrew/var/postgresql@18 -l /opt/homebrew/var/log/postgresql@18.log start
createdb linuxrecall          # 최초 1회

cp .env.example .env.local    # DATABASE_URL, AUTH_PASSWORD, AUTH_SECRET
npm run db:migrate            # 스키마 적용
npm run dev
```

스키마를 고쳤으면 `npm run db:generate`로 마이그레이션을 만들고 `db:migrate`로 적용한다.
`npm run db:studio`로 데이터를 눈으로 볼 수 있다.

## 검증

```bash
npm run typecheck
npm run lint      # 경고 0, 에러 0이 정상
npm run build
```

## 주의사항

- npm 캐시에 root 소유 파일이 섞여 있어 `npm install`이 EACCES로 죽는다.
  `npm install --cache /tmp/npm-cache-lr <pkg>`로 우회한다.
- `drizzle-kit`이 esbuild moderate 취약점을 물고 있다. 개발 전용 의존성이고
  해결하려면 drizzle-kit 0.18로 내려가야 해서 그대로 둔다.
- Node 22.0.0이라 `--experimental-strip-types`를 못 쓴다.
