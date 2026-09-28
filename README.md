# LinuxRecall

리눅스 지식을 구조화해 필기하고, 그 필기에서 **자동으로 파생된 문제**로 간격 반복
학습하는 개인용 플랫폼. 기획 문서는 [`PLANNING.md`](./PLANNING.md).

핵심 전제는 하나다. **필기가 유일한 원본이고 문제는 저장하지 않는다.**
문제를 저장하면 필기를 고쳤을 때 어긋나고, 재생성하면 학습 기록이 날아간다.
필기에서 매번 파생시키면 이 동기화 문제가 구조적으로 생기지 않는다.

## 화면

| 경로               | 화면        | 하는 일                                                               |
| ------------------ | ----------- | --------------------------------------------------------------------- |
| `/`                | 오늘의 학습 | 복습 기한 도래분 / 처음 푸는 문제 / 백지 인출할 섹션 / 새로 필기할 항 |
| `/curriculum`      | 커리큘럼    | 교재 목차 트리. 항별 필기 여부와 체화율                               |
| `/recall`          | 백지 인출   | 섹션 제목과 항목 개수만 보고 전부 재구성 → 3단계 평가                 |
| `/drill`           | 문제 풀이   | 파생 문제 1개씩. 기한 도래분 / 처음 / 헷갈림+모름 필터                |
| `/notes/[id]/edit` | 필기 편집   | 섹션 종류별 입력 폼. 저장 전 파생 문제 수 미리보기                    |

공통: 다크 터미널 테마, 모바일 하단 액션바, 키보드 단축키
(`Space` 공개 / `1·2·3` 평가 / `←→` 이동).

## 데이터가 두 군데 나뉘어 있는 이유

쓰기 빈도와 쓰는 장소가 정반대이기 때문이다.

|           | 쓰기 빈도        | 쓰는 장소        | 저장소              |
| --------- | ---------------- | ---------------- | ------------------- |
| 필기 내용 | 가끔, 책 볼 때   | 노트북           | 파일 (`data/`, git) |
| 학습 상태 | 문제 넘길 때마다 | 폰 포함 어디서나 | PostgreSQL / Neon   |

합쳐두면 문제 한 장 넘길 때마다 필기 파일이 바뀌어 git 히스토리가 학습 로그로
오염된다. 반대로 필기를 DB에 넣으면 git diff·리뷰·롤백을 잃는다.

## 시작하기

### 1. 데이터베이스

```bash
# 로컬 PostgreSQL
pg_ctl -D /opt/homebrew/var/postgresql@18 -l /opt/homebrew/var/log/postgresql@18.log start
createdb linuxrecall
```

### 2. 환경변수

```bash
cp .env.example .env.local
```

| 변수            | 설명                                             |
| --------------- | ------------------------------------------------ |
| `DATABASE_URL`  | 로컬은 `postgresql://localhost:5432/linuxrecall` |
| `AUTH_PASSWORD` | 단일 비밀번호. 비워두면 인증 게이트가 꺼진다     |
| `AUTH_SECRET`   | 세션 쿠키 서명 키. `openssl rand -base64 32`     |

### 3. 스키마 적용 후 실행

```bash
npm install
npm run db:migrate
npm run dev
```

## Vercel 배포

1. Neon에서 DB를 만들고 **pooler** 연결 문자열을 복사한다.
   `-pooler`가 붙지 않은 직접 연결은 서버리스에서 커넥션이 금방 고갈된다.
2. Vercel 환경변수에 `DATABASE_URL`, `AUTH_PASSWORD`, `AUTH_SECRET`을 넣는다.
3. 로컬에서 `DATABASE_URL`을 Neon으로 바꾸고 `npm run db:migrate`를 한 번 돌린다.
4. 푸시하면 배포된다.

배포 환경에서 **필기는 읽기 전용**이다. 런타임 파일시스템에 쓸 수 없기 때문이다.
필기를 고치려면 로컬에서 작성하고 커밋·푸시한다. 평가·복습은 폰에서도 된다.

## 스크립트

```bash
npm run dev          # 개발 서버
npm run typecheck    # tsc --noEmit
npm run lint
npm run build
npm run db:generate  # 스키마 변경 → 마이그레이션 생성
npm run db:migrate   # 마이그레이션 적용
npm run db:studio    # 데이터 브라우저
```
