# 돌보다(Dolboda) 인수인계 문서

> 작성일: 2026-07-30. 이전 Claude Code 세션의 컨텍스트가 가득 차서 새 세션으로 넘기기 위한 문서.
> **새 세션은 반드시 이 폴더(`C:\Users\linea\요양`)에서 열 것** — 코드 전체가 여기 있고, GitHub에도 푸시되어 있음.

---

## 1. 뭘 만드는 건지

**돌보다** — caredoc.kr을 벤치마킹한 요양시설 검색 + 돌봄 매칭 플랫폼.

- **시설 검색**: 전국 요양병원/요양원/주야간보호 등 22,561개 시설을 평가등급·비급여비용·인력현황과 함께 검색/비교/즐겨찾기. 공공데이터(HIRA/NHIS) 기반.
- **모심시터**: 로그인한 회원이 돌봄 시터로 등록(프로필/자격증/활동지역/정산계좌)하는 시스템. 나중에 별도 네이티브 앱으로 확장 예정.
- **돌봄 요청**: 보호자가 돌봄 요청을 올리면 → 활동지역이 겹치는 모심시터가 마이페이지 "일자리 관리"에서 보고 지원 → 보호자가 한 명 확정하는 매칭 흐름.
- 운영자: 장성권 (wkdgytls1201@gmail.com / 010-2222-9943), 개인 프로젝트. 사업자 정보는 나중에 추가 예정.

## 2. 기술 스택

| 항목 | 내용 |
|---|---|
| 프레임워크 | Next.js 14 (App Router), React 18, TypeScript |
| 스타일 | Tailwind CSS — 커스텀 토큰: `primary`(코랄), `royal`(진보라), `ivory`(배경 `#FFFBF3`), `mint`, `peach`, `accent`(골드), `ink`(텍스트 회색 스케일) |
| DB | Supabase Postgres. `DATABASE_URL`=풀링(포트 6543, 런타임용), `DIRECT_URL`=직결(5432, 마이그레이션/스크립트용) |
| ORM | Prisma v7 (driver-adapter 방식, `@prisma/adapter-pg`). **마이그레이션 파일 없이 `prisma db push`만 사용 중** (정식 migrate 도입은 백로그) |
| 인증 | NextAuth v5 (Auth.js) + `@auth/prisma-adapter`, **카카오 로그인만**, database 세션 전략. 쿠키명 `authjs.session-token` |
| 지도 | Kakao Maps JS SDK (지도/로드뷰/지오코딩) |
| 이메일 | Resend (`lib/resend.ts`) — 상담 신청 접수 시 발송 |
| 배포 | Vercel: https://dolboda-rho.vercel.app / GitHub: https://github.com/wkdgytls1201-dotcom/Dolboda.git (브랜치 `main`) |
| 아이콘 | lucide-react |

## 3. 실행 방법

```bash
npm install        # postinstall에서 prisma generate 자동 실행
npm run dev        # http://localhost:3000
npx tsc --noEmit   # 타입체크
npx prisma db push # 스키마 변경 반영 (migrate 대신 이걸 씀)
```

`.env.local`에 필요한 키 (값은 기존 폴더의 .env.local에 이미 있음, Vercel에도 Production 환경변수로 등록 완료):
`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_KAKAO_ID`, `AUTH_KAKAO_SECRET`, `KAKAO_REST_API_KEY`, `NEXT_PUBLIC_KAKAO_JS_KEY`, `RESEND_API_KEY`, `HIRA_SERVICE_KEY` (+ HIRA_* base URL들)

**⚠️ 최중요 함정**: `npx prisma generate` 후에는 **개발 서버를 완전히 재시작**해야 함 (`lib/prisma.ts`가 HMR용 글로벌 캐싱을 해서 재시작 전까지 새 모델/필드를 못 봄). 이번 세션에서만 3번 당했음.

## 4. 파일 구조 (주요 파일 역할)

```
app/
  page.tsx                  홈 — 히어로배너(7장), 내주변시설, 추천시설, 점수높은시설, 최근설립
  search/, facility/[id]/   시설 검색/상세 (FacilityPhotoGallery, KakaoMap/Roadview)
  compare/, favorites/      비교(최대3개)/관심시설 (localStorage + Context)
  care-request/page.tsx     ★ 돌봄 요청 (보호자용 3단계 마법사 + 상세/지원자 관리) — 지금 4단계로 확장 중
  mypage/
    page.tsx                계정 설정 (로그아웃, 숨겨진 회원탈퇴)
    edit/page.tsx           회원정보 수정 안내(카카오 연동이라 직접수정 불가 설명)
    sitter/register/        모심시터 등록 5단계 마법사 (약관 전체동의 토글 있음)
    sitter/profile|jobs|settlements|notifications/  시터 전용 4탭
  notifications/            지역별 알림 신청 (localStorage 기반, 실제 발송 인프라 없음)
  api/
    facilities/…            시설 목록/통계/nearby(서버사이드 거리계산 SQL)
    care-requests/…         돌봄요청 CRUD + open(시터용 지역매칭 목록) + 중복신청 409
    care-request-applications/…  지원/확정(트랜잭션)/철회
    sitter-profile/…        시터 프로필/자격증 CRUD
    account/route.ts        회원탈퇴 DELETE (cascade)
  terms/, privacy/          이용약관/개인정보처리방침 (+ /terms/sitter, /privacy/sitter)
components/
  Header.tsx  Logo.tsx(public/logo.png 사용)  HeroBanner.tsx  SearchHero.tsx
  FilterBar.tsx(모바일=화면중앙 고정시트)  FacilityCard/Thumbnail/PhotoGallery.tsx
  KakaoMap/KakaoRoadview.tsx(미리보기는 드래그/줌 비활성)  LocationConsentModal.tsx
  MyPageShell.tsx(마이페이지 공용 레이아웃, 시터여부에 따라 탭 분기)  AuthModal.tsx
lib/
  types.ts(Facility 타입, photos?: string[])  prisma.ts  useFacilities.ts(+useNearbyFacilities)
  regions.ts(시/도 17개)  householdTasks.ts(가사돌봄 체크리스트 8개)  promotedFacilities.ts(수동 추천시설 ID)
  compareContext.tsx  favoritesContext.tsx  resend.ts
prisma/schema.prisma        Facility, ConsultRequest, NextAuth 4종, SitterProfile,
                            SitterCertification, CareRequest, CareRequestApplication
scripts/geocode-db.mjs      카카오 지오코딩 배치 (lat IS NULL만 처리 → 중단돼도 재실행하면 이어짐)
auth.ts                     NextAuth 설정 (scope: profile_nickname account_email talk_message)
```

## 5. 어디까지 됐는지

### 완성 (배포됨)
- 시설 검색/상세/비교/관심시설/상담신청(Resend 메일) 전부 동작
- 지오코딩 **21,575/22,561 (95.6%) 완료** — 실패 986건은 카카오맵 미등록 추정. "내 주변 시설"은 전국 어디서든 서버사이드 거리계산으로 동작
- 카카오 로그인 (비즈앱 전환 완료, Redirect URI·JS SDK 도메인에 프로덕션 주소 등록 완료)
- 마이페이지 전체 + 모심시터 등록/프로필/일자리/정산/알림설정
- 돌봄 요청 v1: 보호자 등록(3단계) → 시터 지원 → 보호자 확정, 중복신청 방지(409)
- 모바일 UX 다수 수정 (헤더 축소, 필터 시트, 히어로 터치 시 멈춤 버그, 비교 빈화면 플래시 등)

### 진행 중이던 작업 ← ★ 여기서 끊김
**돌봄 요청 확장: 돌봄 유형(병원/가사돌봄/집에서) + 돌봄 확인서** — 아래 6번 참조.

## 6. 다음에 할 일 (승인된 계획, 순서대로)

계획 원문: `C:\Users\linea\.claude\plans\imperative-petting-sedgewick.md` (이 문서에도 요약함)

- [x] **(완료)** `prisma/schema.prisma`: `CareLocationType` enum(HOSPITAL/HOUSEKEEPING/HOME) + `CareRequest`에 `locationType`(기본 HOSPITAL), `householdTasks String[]`, `visitsPerWeek Int?`, `visitHours Int?` 추가, `situation`/`mobilityLevel`을 옵셔널로 변경. **`db push` + `generate` 완료됨. 단, 개발서버 재시작 안 했으니 새 세션에서 서버 켜면 자동 해결.**
- [x] **(완료)** `lib/householdTasks.ts` 생성 — 체크리스트 8개 항목.
- [ ] **`app/care-request/page.tsx` 마법사 3→4단계 확장**:
  - 새 1단계 "어떤 돌봄이 필요하세요" — 병원/가사돌봄/집에서 카드 3개 선택 (기존 REGIONS 칩 버튼 스타일 재사용)
  - 3단계(상황)를 타입별 조건부 렌더: **병원**=기존 그대로(상황 필수+거동+식사/배변+질환칩) / **가사돌봄**=상황(선택)+householdTasks 체크리스트+주당 방문횟수/1회 시간 / **집에서**=상황+거동 재사용+방문횟수/시간(선택)
  - `canProceed()`: 병원만 situation 필수, 가사돌봄은 householdTasks 1개 이상
  - submit payload에 `locationType, householdTasks, visitsPerWeek, visitHours` 추가
  - `CareRequestDetail`에 타입 배지 + 타입별 필드 표시, `CareRequestData` 인터페이스에 새 필드 추가
- [ ] **API 라우트에 새 필드 반영**: `app/api/care-requests/route.ts`(POST) + `[id]/route.ts`(PATCH)에서 새 필드 수용, `open/route.ts` 응답에 포함. situation 필수검증을 locationType별로 완화.
- [ ] **`app/mypage/sitter/jobs/page.tsx`**: 카드에 타입 배지(병원=primary/가사돌봄=mint/집에서=peach) + 가사돌봄이면 상황 대신 체크리스트 칩 표시.
- [ ] **돌봄 확인서**: 신규 `app/api/care-request-applications/mine/route.ts`(시터 본인의 매칭확정 건 조회) + 신규 `app/care-request/confirmation/page.tsx`(보호자/시터 양쪽 접근, "법적 계약서가 아님" 명시, `window.print()`로 PDF 저장) + `app/globals.css`에 `@media print` 규칙. 확정 후 상세화면/지원자카드에 확인서 링크 노출.
- [ ] **검증 & 배포**: `npx tsc --noEmit` → 개발서버 재시작 후 아래 10번 테스트 기법으로 가사돌봄 타입 전체 흐름(생성→지원→확정→확인서) 확인 → 모바일 뷰포트 확인 → 커밋/푸시.

**예상 남은 작업량**: 집중해서 1~1.5시간 정도 분량.

## 7. 중요한 결정사항·규칙 (반드시 지킬 것)

1. **주민등록번호 절대 수집 안 함.** caredoc은 실제 원천징수·보험가입 때문에 법적 근거가 있지만 우리는 없음 → 개인정보보호법 위반 소지. 지원 시 신원확인 절차 없이 그대로 유지.
2. **"계약서"라는 단어 금지.** 법적 구속력 있는 것처럼 보이면 안 됨 → **"돌봄 확인서"**로 부르고 "법적 계약서가 아닌 확인용 문서" 문구 명시.
3. **가격/금액을 어디에도 표시하지 않음.** 결제 인프라 없음. "매칭 확정 후 협의해 안내" 문구만. 가짜 숫자 만들어내지 않기.
4. **caredoc 워딩/구성 그대로 베끼지 않기.** 사용자가 여러 번 강조: "워딩 최대한 개성있고 다르게, 구성·순서 더 UX 친화적이게, 스텝 더 효율적이게". 스크린샷은 참고만.
5. **모바일 최우선.** 사용자 대부분 모바일. 하단 고정 CTA 바, 스와이프, 반응형 필수.
6. **회원탈퇴는 눈에 안 띄게** (작은 글씨, 우측 하단) — 사용자 명시 요청.
7. 위치권한은 **커스텀 모달(LocationConsentModal) 먼저 → 브라우저 네이티브 프롬프트** 순서. 허용=localStorage(영구), "다음에"=sessionStorage(다음 방문 시 재요청). 한번 뺐다가 사용자가 되돌리라고 한 것이니 다시 제거하지 말 것.
8. 시터 서비스는 **정보 중개만** (고용관계 아님) — 약관(/terms/sitter)에 명시되어 있음.
9. 시설 사진: `facility.photos`가 있으면 로드뷰보다 **자동 우선** 표시 (FacilityThumbnail 최상단 분기). 수동 제거 작업 불필요.

## 8. 배포/인프라 메모

- **Vercel**: 환경변수는 프로젝트 Settings → Environments → **Production** 안에 있음 (신 UI라 플랫 목록 아님). `postinstall: prisma generate` 필수 (없으면 빌드 실패).
- **git push**: Git Credential Manager가 브라우저 인증 팝업을 요구할 때가 있음 — 그때는 사용자가 실제 터미널에서 직접 push 해야 함. 인증된 상태면 Claude의 Bash에서 push 가능.
- **카카오 콘솔**: Redirect URI는 "플랫폼 키 → REST API 키" 아래에, JS SDK 도메인은 "플랫폼 키 → JavaScript 키" 아래에 있음 (UI가 바뀌어서 찾기 어려움). 비즈앱 전환 완료. `account_email` scope 추가했으니 콘솔에서 이메일 동의항목 활성화 여부 확인 필요할 수 있음.
- **AUTH_SECRET 프로덕션 로테이션** 아직 안 함 (백로그).

## 9. 개발 시 주의점 (이번 세션에서 실제로 당한 것들)

1. **prisma generate 후 dev 서버 완전 재시작** (위 3번 참조. 최다 빈출 함정).
2. `scripts/geocode-db.mjs`의 수동 env 파서는 따옴표 제거(`.replace(/^"(.*)"$/, "$1")`)가 들어가 있음 — 다른 스크립트 만들 때도 동일 이슈 주의.
3. 장시간 DB 스크립트는 Supabase 풀링 연결이 가끔 끊김("Connection terminated unexpectedly") — 행 단위 저장 설계라 그냥 재실행하면 이어짐.
4. 카카오 지오코딩 API를 병렬 워커로 때리면 rate-limit으로 대량 실패 — 단일 워커로만 돌릴 것.
5. Next.js 이미지에 `<img>` 쓸 때 eslint-disable 주석 패턴 사용 중 (`// eslint-disable-next-line @next/next/no-img-element`).

## 10. 로그인 없이 세션 기능 테스트하는 방법 (검증에 필수)

실제 카카오 OAuth 없이 테스트하는 확립된 기법:
1. DB에 직접 `Session` 행 삽입: 아는 `sessionToken` 값 + 먼 미래 `expires` + 테스트 유저 `userId`.
2. 브라우저 콘솔/javascript_tool에서 `document.cookie = "authjs.session-token=<토큰>; path=/; max-age=3600"`.
3. **주의**: 같은 브라우저에서 두 번째 세션으로 "전환"은 안 됨 (HttpOnly 쿠키가 재발급되어 JS로 못 덮음). → **같은 테스트 유저에게 SitterProfile을 추가**해서 보호자+시터 역할을 한 계정으로 검증하는 방식 사용.
4. 검증 끝나면 테스트 데이터(Session, SitterProfile, CareRequest 등) 삭제.

## 11. 장기 백로그 (이번 작업과 무관, 잊지 말 것)

- Prisma 정식 마이그레이션 도입 (지금은 db push만)
- AUTH_SECRET 프로덕션 로테이션, 커스텀 도메인
- HIRA 등급코드 완전 매핑, SILVER_TOWN/HOME_CARE 데이터 모델 정리
- 시설 실사진 확보 (100GB 분량 처리 논의했었음 — photos 필드/갤러리는 이미 준비됨)
- 알림 실제 발송 인프라 (지금은 localStorage 신청만)
- 지오코딩 실패 986건 재시도 or 주소 정제
- 사업자 정보 등록 (사용자가 "나중추가예정"이라 함)
- 로그인 확장 (카카오 외), 전국 데이터 정합성 점검

## 12. 에러/미해결 이슈

현재 빌드 깨진 것 없음. 마지막 상태에서 `tsc` 에러 없었고, 배포도 정상. 유일한 "미완" 상태는 6번의 진행 중 작업(스키마는 이미 DB에 반영됐지만 UI/API가 아직 새 필드를 안 쓰는 상태 — 기본값이 있어서 기존 기능은 전부 정상 동작함).
