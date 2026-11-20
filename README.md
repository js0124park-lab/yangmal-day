# 양말이의 하루

"양말이의 하루 디자인 초안" 캔버스를 Vite + React + TypeScript로 옮긴 게임 프로토타입입니다.

## 실행

Node.js 18 이상이 필요합니다.

```bash
npm install
npm run dev
```

`.env.local`이 없으면 오프라인으로 동작하고 이 기기에만 저장됩니다. 처음부터 다시 하려면 설정 화면의 "진행 처음부터 다시 하기"를 쓰세요.

## Supabase (로그인 · 클라우드 저장)

1. Supabase 프로젝트를 만들고 `supabase/migrations/20261120090000_init.sql`을 적용합니다(SQL Editor에 붙여 실행하거나 `supabase db push`).
2. `.env.example`을 `.env.local`로 복사하고 Project URL과 anon(publishable) 키를 넣습니다.
3. 대시보드 설정
   - Authentication → Sign In / Providers → **Allow anonymous sign-ins** 켜기 (게스트 시작용)
   - Authentication → URL Configuration → Site URL과 Redirect URLs에 `http://localhost:5173`과 실제 배포 주소 추가 (가입 확인, 로그인 링크, 비밀번호 재설정 메일이 `/login`으로 돌아옴)
   - 실제 서비스 전에는 Custom SMTP를 설정하세요. 기본 메일 발송은 시간당 몇 통으로 제한됩니다.
   - 익명 가입 남용을 막으려면 Auth → Attack Protection에서 CAPTCHA를 켜는 것을 권장합니다.

연결된 프로젝트: `yangmal-day` (ref `mbcuekxfaswvbxncpjxg`, 서울). 마이그레이션 3개가 적용되어 있습니다.

### 데이터 구조

| 테이블 | 내용 | 보안(RLS) |
|---|---|---|
| `profiles` | 사용자별 보호자 이름. 가입(게스트 포함) 시 트리거로 생성 | 본인 행만 읽기·수정 |
| `game_saves` | 사용자별 게임 상태(jsonb) + `revision` | 본인 행만 읽기·쓰기 |
| `ball_scores` | 사용자별·주별(월요일, 한국 시간) 공놀이 최고 점수 | 본인 행만 읽기, 쓰기는 함수로만 |

| API 함수 (`public`) | 하는 일 |
|---|---|
| `save_game(state, base_revision)` | 저장. 다른 기기가 먼저 저장했으면 `revision_conflict` |
| `submit_ball_score(score)` | 이번 주 최고 점수 갱신(0~20,000만 허용), 내 순위 반환 |
| `get_ball_ranking(limit)` | 이번 주 상위 랭킹. 보호자 이름만 공개, 사용자 ID 비공개 |
| `delete_my_account()` | 내 계정과 모든 데이터 삭제 |

권한이 필요한 함수 본체는 API에 노출되지 않는 `private` 스키마에 있고, `public`에는 호출자 권한으로 실행되는 얇은 함수만 있습니다(Supabase 보안 점검 권장 방식).

저장은 `save_game(state, base_revision)` RPC로 합니다. 마지막으로 본 `revision`이 서버와 다르면 `revision_conflict` 오류를 내서, 두 기기가 서로의 진행을 모르고 덮어쓰지 못하게 합니다.

### 저장 흐름

- 플레이는 항상 기기에 먼저 저장되고, 변경 후 1.5초 뒤 클라우드에 올라갑니다. 탭을 닫거나 숨길 때도 바로 저장을 시도합니다.
- 오프라인이면 2초 → 4초 → … 최대 60초 간격으로 다시 시도하고, 인터넷이 돌아오면 바로 저장합니다.
- 탭으로 돌아오면 다른 기기에서 저장한 진행이 있는지 확인해 불러옵니다.
- 기기와 클라우드 진행이 엇갈리면(다른 기기에서 저장했거나, 게스트 진행이 있는 채로 기존 계정에 로그인) 두 진행을 비교해 보여 주고 하나를 고르게 합니다.
- 게스트(익명 사용자)가 이메일을 연결하면 사용자 ID가 그대로라 진행이 그대로 이어집니다.

### 게임 시간

- 새벽 5시(한국 시간)에 오늘의 할 일, 보너스 상자, 케어 완료, 출석 선물(우편함)이 초기화됩니다.
- 시간이 흐르면 포만감 -5, 즐거움 -3, 청결도 -2씩(시간당) 줄고 체력은 +8씩 회복합니다. 한 번에 최대 48시간까지만 반영합니다.

## 앱 설치 (PWA) · 오프라인

- 휴대폰 홈 화면에 추가하면 주소창 없이 앱처럼 열립니다. Android·PC Chrome/Edge는 설정 화면의 "홈 화면에 추가" 버튼, iPhone은 Safari 공유 → "홈 화면에 추가".
- 서비스 워커가 앱 코드·이미지·폰트(약 5MB)를 기기에 저장해, 한 번 연 뒤에는 인터넷 없이도 시작하고 플레이할 수 있습니다. 진행은 연결되면 클라우드에 올라갑니다.
- Supabase(로그인·저장) 응답은 절대 캐시하지 않습니다.
- 새 버전이 배포되면 "새 버전이 준비됐어요 [새로고침]" 알림이 뜹니다. 플레이 중 저절로 새로고침되지 않습니다.
- 서비스 워커는 빌드 결과에서만 동작합니다: `npm run build && npm run preview` (http://localhost:4173).
- 아이콘은 `public/icons/` (일반 192·512, 마스커블 512, Apple 180).

화면 코드는 화면별로 나뉘어(각 3~8KB) 필요할 때 받고, 타이틀이 뜬 뒤 쉬는 시간에 미리 받아 둡니다. React·Supabase는 별도 묶음이라 앱을 업데이트해도 다시 받지 않습니다.

## 테스트

```bash
npm test          # 게임 규칙·시간 경과·저장 불러오기·동기화 판단 단위 테스트 (28개)
npm run typecheck
npm run test:e2e  # 빌드 후 브라우저 테스트 12개 (390×844 폰 크기). 화면 캡처는 e2e-screens/ 에 저장
                  #  - screens: 9개 화면 조작   - guest-cloud: 게스트 클라우드 저장·기기 2대·충돌·랭킹·계정 삭제
                  #  - pwa: 설치 정보·아이콘, 인터넷을 끊고 시작·플레이
                  # 테스트가 만든 게스트 계정은 테스트가 끝나면 지웁니다 (이메일 계정은 건드리지 않음)
                  # 설치된 Edge로 돌리려면: PowerShell에서 $env:PW_CHANNEL='msedge'; npm run test:e2e
```

브라우저 테스트는 실행 중인 `npm run dev`를 쓰고, 없으면 직접 띄웁니다. 로그인 테스트는 실제 Supabase에 틀린 비밀번호를 보내 오류 문구를 확인합니다.

## 구조

```
public/images, public/fonts   디자인 이미지와 폰트 (쿠키런, Pretendard)
src/styles/app.css            색·폰트 토큰과 화면 스타일 (디자인 그대로)
src/styles/motion.css         화면 전환, 누름 반응, 떠오르는 효과, 토스트, 미니게임 표시
src/game/state.tsx            게임 상태(useReducer + Context), 보상·레벨업 계산, 시간 경과, 기기 저장
src/game/time.ts              게임 하루(05:00 KST)와 시간당 스탯 변화
src/game/saveMeta.ts          동기화 기록(소유자, revision, 미동기화 변경 수)
src/auth/AuthProvider.tsx     로그인 상태와 동작 (게스트, 이메일, 링크, 비밀번호, 계정 연결)
src/sync/SyncProvider.tsx     클라우드 동기화 (자동 저장, 재시도, 충돌 선택, 계정 삭제)
src/sync/reconcile.ts         로그인 시 기기·클라우드 저장본 처리 판단 (순수 함수, 테스트 있음)
src/lib/                      Supabase 클라이언트, 저장 API, DB 타입, 한국어 오류 메시지
supabase/migrations/          DB 스키마 (테이블, RLS, 트리거, save_game RPC)
src/game/hooks.ts             useFrame(애니메이션 루프), useFloaters, buzz(진동)
src/components/               공용 UI, 아이콘, Toast, Floaters
src/data/mock.ts              고정 콘텐츠 (할 일, 케어, 포즈, 가구, 간식 위치)
src/screens/*                 화면 9개
```

## 화면별 조작

| 경로 | 화면 | 조작 |
|---|---|---|
| `/` | 타이틀 | "터치해서 시작하기"는 게스트로 바로 시작(6초 안에 연결 안 되면 기기에 먼저 저장), "로그인하고 이어하기"는 로그인 화면 |
| `/login` | 로그인 | 로그인, 회원가입, 메일 로그인 링크, 비밀번호 찾기·재설정, 게스트 계정 연결 |
| `/settings` | 설정 | 계정 상태, 저장 상태와 지금 저장, 보호자 이름, 비밀번호 변경, 로그아웃, 진행 초기화, 계정 삭제 |
| `/home` | 홈 | 사진을 누르면 쓰다듬기(하트, 친밀도·즐거움 +1). 스탯·코인·레벨은 실시간 반영, 우편함은 한 번 코인 +100 |
| `/todo` | 오늘의 할 일 | 체크 토글, 5개 완료 시 보너스 상자 받기. 배경을 누르거나 Esc로 닫기 |
| `/kitchen` | 화식키친 | 칼 표시가 초록 구간에 올 때 탭(5번). 판정과 콤보에 따라 별 1~3개, 완성 후 먹이기 → 포만감·보상, 레벨업 시 레벨업 화면 |
| `/levelup` | 레벨업 | 실제 레벨업 정보를 표시. 진화 단계가 바뀔 때만 진화 전후 비교 |
| `/walk` | 산책 | 방향 버튼 누르고 있기, 조이스틱 드래그, 방향키로 이동. 체력 소모. 냄새 맡기(Space)로 간식 방향 힌트, 가까우면 줍기 |
| `/ball` | 공놀이 | 30초 라운드. 양말이가 초록 착지 구간에 있을 때 탭하면 콤보 배율 x1~x2.5. 끝나면 최고 기록과 보상 반영, 로그인 상태면 주간 랭킹에 기록하고 "랭킹"으로 순위표 보기 |
| `/care` | 케어 | 목욕·빗질은 사진을 문지르기, 발톱은 톡톡 누르기. 완료 시 청결도·보상 |
| `/deco` | 집 꾸미기 | 카테고리 필터, 가구 구매(코인·하트)와 배치, 회전·보관·배치 확정, 반응 미리보기, 저장 |

레벨업은 어느 화면에서 일어나든 알림으로 알려 주고, "보기"를 누르면 레벨업 화면으로 갑니다. 시스템에서 "동작 줄이기"를 켜면 애니메이션이 꺼집니다.
