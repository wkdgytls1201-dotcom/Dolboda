# 돌보다(Dolboda) 인수인계 문서

> 최종 갱신: 2026-07-31 · 이 문서만 읽고 바로 이어서 작업할 수 있도록 작성했습니다.
> **새 세션은 반드시 `C:\Users\linea\요양` 폴더에서 열어주세요.** 코드 전체가 여기 있고 GitHub에도 푸시돼 있습니다.

---

## 1. 프로젝트 목표와 배경

### 무엇을 만드는가
**돌보다** — 요양시설 검색 + 돌봄 인력 매칭 플랫폼. 벤치마킹 대상은 **케어닥(caredoc.kr)**.

부모님 요양시설을 알아보는 보호자는 지금 정보가 흩어져 있어 힘듭니다. 국민건강보험공단 사이트에 시설 목록은 있지만 비교가 어렵고, 평가등급이 뭘 뜻하는지도 알기 어렵습니다. 그래서 두 가지를 합쳤습니다.

1. **시설 정보** — 전국 23,843개 요양시설을 평가등급·비급여비용·인력현황과 함께 검색·비교
2. **돌봄 매칭** — 보호자가 돌봄 요청을 올리면 모심시터(돌봄 인력)가 지원하고 보호자가 고르는 구조

### 서비스 대상
- **보호자**: 부모님 시설을 알아보거나 간병인이 필요한 자녀 세대
- **모심시터**: 돌봄 일자리를 찾는 요양보호사·간병인 (나중에 별도 앱으로 확장 예정)

### 운영 정보
- 운영자: 장성권 / wkdgytls1201@gmail.com / 010-2222-9943
- 개인 프로젝트 (사업자 등록은 "나중에 추가 예정"이라고 본인이 명시)
- 배포: https://dolboda-rho.vercel.app
- 저장소: https://github.com/wkdgytls1201-dotcom/Dolboda (브랜치 `main`)

### 중요한 맥락
- **사용자는 거의 모바일로 확인합니다.** 모든 작업은 모바일 우선으로 검증해야 합니다.
- 사용자가 케어닥 화면을 스크린샷으로 계속 공유하며 "이것보다 더 좋게" 요구합니다. 스크린샷 위치는 아래 12번 참고.
- 사용자는 **워딩·구성을 케어닥과 똑같이 베끼는 것을 명시적으로 반대**합니다. 참고만 하고 우리 식으로 다시 짜야 합니다.

---

## 2. 기술 스택과 실행 방법

| 항목 | 내용 |
|---|---|
| 프레임워크 | Next.js 14 (App Router), React 18, TypeScript |
| 스타일 | Tailwind CSS — 커스텀 토큰: `primary`(코랄 #FF6250), `royal`(보라 #7C42BD), `ivory`(배경 #FFFBF3), `mint`, `peach`, `accent`(골드), `ink`(텍스트 회색) |
| DB | Supabase Postgres. `DATABASE_URL`=풀링(6543, 런타임), `DIRECT_URL`=직결(5432, 스크립트/마이그레이션) |
| ORM | Prisma v7 (driver-adapter, `@prisma/adapter-pg`). **마이그레이션 파일 없이 `db push`만 사용 중** |
| 인증 | NextAuth v5 (Auth.js) + `@auth/prisma-adapter`, **카카오 로그인만**, database 세션. 쿠키명 `authjs.session-token` |
| 지도 | Kakao Maps JS SDK |
| 이메일 | Resend (`lib/resend.ts`) — 상담 신청 접수 |
| 아이콘 | lucide-react |

```bash
npm install        # postinstall에서 prisma generate 자동 실행
npm run dev        # http://localhost:3000
npx tsc --noEmit   # 타입체크 (커밋 전 항상)
npx prisma db push # 스키마 변경 반영
```

`.env.local` 필요 키 (기존 폴더에 이미 있음, Vercel Production에도 등록 완료):
`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_KAKAO_ID`, `AUTH_KAKAO_SECRET`, `KAKAO_REST_API_KEY`, `NEXT_PUBLIC_KAKAO_JS_KEY`, `RESEND_API_KEY`, `HIRA_SERVICE_KEY`, `HIRA_HOSP_INFO_BASE`, `HIRA_HOSP_EVAL_BASE`, `HIRA_HOSP_DETAIL_BASE`, `HIRA_NONPAYMENT_BASE`

---

## 3. 지금까지 완료한 것 (결과물 전부)

### 3-1. 시설 검색 (기반 기능)
- 전국 시설 검색·필터(유형/평가등급/거리/진료과목/빈자리/공공데이터)·정렬(거리순·등급순·평점순)
- 시설 상세: 평가등급, 인력현황, 비급여비용, 본인부담금 계산기, 카카오 지도·로드뷰, 사진 갤러리
- 최대 3곳 비교, 관심시설, 상담 신청(DB 저장 + Resend 메일 발송)
- **검색 상태 유지**: 상세 갔다 뒤로가기해도 검색어·필터·정렬이 남음 (sessionStorage)

### 3-2. 데이터 (DB 현황 · 2026-07-31 기준)

| 시설 유형 | 개수 | 좌표 확보 |
|---|---|---|
| 방문요양센터 (HOME_CARE) | 15,678 | — |
| 요양원 (NURSING_HOME) | 6,246 | — |
| 주야간보호 (DAY_NIGHT_CARE) | 5,632 | — |
| **요양병원 (NURSING_HOSPITAL)** | **1,303** | 1,303 |
| 실버타운 (SILVER_TOWN) | 1 | 1 |
| **합계** | **28,860** | 27,697 |

인천·전북·경북 지역이 잘못된 파일(각각 대구·강원·충남 데이터)로 채워져 있던 문제를 발견해 올바른 파일로 재수집, 5,017곳 신규 추가(2026-07-31). 기존 시설의 좌표는 건드리지 않고 신규분만 지오코딩(성공 4,840 / 실패 1,163 — 카카오맵 미등록 주소, 기존 5-3 백로그와 같은 종류). 요양병원 1,303곳은 이전 세션에 새로 수집(기존 21곳 → 1,303곳). 인력등급 1,247곳, 진료과목 1,299곳, 병상수 1,301곳, 의료장비 1,195곳까지 채워져 있습니다.

### 3-3. 돌봄 요청 시스템 (보호자 ↔ 모심시터 매칭)

**보호자 흐름**: `/care-request`
- **5단계 마법사** — ① 돌봄 유형(병원/가사돌봄/자택) ② 언제·어디서 ③ 누구를 돌보나 ④ 어떤 도움 ⑤ 조건 확인
- 요청서 필드: 지역·장소·기간·시간대·24시간 상주 여부 / 돌봄 받는 분(관계·성별·연령대·체중대) / 거동·식사·배변 보조 4단계 / 질환 / 집안일 체크리스트 / 방문 주기 / 병원 입원 정보(출입절차·병실·입원사유·수술예정) / 선호 성별 / 특별 요청 / 희망 사례비 / 전달사항
- **커스텀 날짜 달력** (`DateRangeCalendar`) — 두 달 동시 표시, 범위 띠 강조, 1주/2주/1개월/3개월 빠른 선택
- 중복 요청 방지(409), 등록 직후 축하 배너 + 다음 단계 안내
- 지원자 목록 확인 → 확정 → 돌봄 완료 처리
- **비로그인 안내 화면** — 이용 절차 3단계, 로그인이 필요한 이유 3가지, 대안 링크

**모심시터 흐름**: `/mypage/sitter/*`
- 등록 5단계 마법사(약관 전체동의 토글 / 기본정보 / 경력·자격증 / 활동지역 / 정산계좌)
- 소개글 작성 가이드·예시·글자수 카운터
- **일자리 관리 4탭**: 새 일자리 / 지원 현황 / 매칭된 돌봄 / 완료
- 정렬(최신·시작임박·사례비 높은순) + 유형 필터 + 마감 제외
- **지원 확인 시트** — 바로 지원되지 않고 "보호자에게 내 프로필이 이렇게 보여요" 미리보기 후 확정
- 프로필 관리 / 정산 관리 / 알림 설정

**공통**
- **돌봄 확인서** `/care-request/confirmation` — 매칭 확정 시 양측이 보는 요약 문서, `window.print()`로 PDF 저장
- 상태 전이: 지원완료 → 매칭확정 → 돌봄완료

### 3-4. 장기요양등급 예상 테스트 `/grade-test`
- 실제 **장기요양인정조사표 5개 영역 52항목** 그대로 반영 (신체기능12·인지기능7·행동변화14·간호처치9·재활10)
- 영역별 5화면 (케어닥은 문항마다 화면 전환 — 우리가 훨씬 빠름)
- 결과: 예상 등급 + 영역별 도움 필요도 막대 + 이용 가능 서비스 + 신청 5단계 + 제도 안내(자격·기간·비용구조·유효기간)
- **비로그인 시 결과 블러 처리** + 로그인 유도, 답변 52개는 sessionStorage에 보존돼 로그인 후 복원

### 3-5. 돌봄 서비스 소개 `/services`
- 4종(병원 간병 / 집에서 돌봄 / 가사 돌봄 / 가족 간병) 접이식 카드
- SVG 일러스트(외부 이미지 없음), 4종 비교표, 예시 공고 카드, 이용 절차 3단계
- 각 카드 CTA가 `?type=`을 넘겨 마법사 1단계를 건너뜀

### 3-6. SEO / GEO
- 루트 메타데이터(키워드·OG·트위터카드), `robots.ts`, `sitemap.ts`
- **지역 랜딩 761개**: `/region/[시도]` 13개 + `/region/[시도]/[시군구]` 182개 + `/region/[시도]/[시군구]/[유형]` 566개
- 구조화 데이터: WebSite·Organization·SearchAction / BreadcrumbList / ItemList / FAQPage / HowTo / LocalBusiness·Hospital(geo 좌표 포함)
- 시설 상세 22,000여 페이지 개별 title·description 자동 생성
- OG 이미지 1200×630 (`public/og.png`), AI 검색용 `public/llms.txt`
- 구글 서치콘솔·네이버 서치어드바이저 소유확인 완료 + 사이트맵 제출 완료
- 사이트맵 총 URL 약 23,300개

### 3-7. 성능
- 목록 API에 `view=card` 모드 — 카드에 필요한 필드만 전송. **300건 289KB → 113KB (61% 감소)**
- 히어로 배너: 로컬 데이터로 즉시 렌더(API 대기 제거), 첫 장만 eager + srcset으로 모바일 480px

### 3-8. 모바일 최적화
- 검색 필터바 **360px → 189px** (칩 가로 스크롤로 변경)
- 44px 미만 터치 타겟 전수 확대: 배너 인디케이터(7px→40px), 카드 관심/비교(37→48), 필터 칩 X(17→32), 비교바 X(19→32), 툴팁(19→40), 지역 칩(34→44)
- sticky 오프셋을 헤더 높이와 정합, safe-area 대응, 입력 글자 16px(iOS 자동확대 방지)

---

## 4. 확정된 결정사항과 규칙 ⚠️ 반드시 지킬 것

### 4-1. 절대 하지 않기로 한 것

| 금지 | 이유 |
|---|---|
| **주민등록번호 수집** | 케어닥은 지원 시 요구하지만, 실제 원천징수·배상보험 가입이라는 법적 근거가 있어서임. 우리는 그 인프라가 없어 개인정보보호법 위반 소지. 지원 시 신원확인 절차 없이 진행 |
| **"계약서" 표현** | 법적 구속력 있는 것처럼 보이면 안 됨. **"돌봄 확인서"**로 부르고 "법적 계약서가 아님" 명시 |
| **우리가 계산한 가격 표시** | 결제 인프라 없음. 단, **보호자가 직접 입력한 희망 사례비**는 그대로 전달 OK (우리가 만든 숫자가 아니므로) |
| **매년 바뀌는 금액 안내** | 등급별 월 한도액·본인부담률은 고시로 변경됨. 구조만 설명하고 금액은 공식 홈페이지로 |
| **없는 데이터를 지어내기** | 평가 세부점수가 없으면 "아직 공개되지 않았어요"로 표시. 가짜 점수 생성 금지 |
| **케어닥 워딩·구성 그대로 베끼기** | 사용자가 여러 번 명시적으로 요구. 참고만 하고 우리 워딩으로 |

### 4-2. 지켜야 할 방향

- **기존 기능 제거는 반드시 확인받고 진행.** 리팩터링·정리 중 이미 있던 기능(화면·API·필드·동작)을 없애야 할 것 같으면 먼저 사용자에게 묻고, 승인 전에는 제거하지 않는다. (2026-07-31 추가, `CLAUDE.md`에도 명시)
- **앱 성능 최적화가 최우선 목표.** 번들 크기·응답 페이로드·불필요한 리렌더/재요청을 항상 의식하고, 만들 때부터 가볍게 만든다. (2026-07-31 추가)
- **SEO·GEO(AI 검색 노출)도 최우선 목표.** 새 페이지엔 메타데이터·구조화 데이터(JSON-LD)·sitemap 반영을 기본 작업 범위로 포함시킨다. (2026-07-31 추가)
- **최대한 가볍게(lightweight).** 불필요한 의존성·큰 클라이언트 번들·과도한 이미지·데이터 전송을 피하고, 같은 결과면 더 가벼운 방법을 고른다. (2026-07-31 추가)
- **모바일 최우선.** 터치 타겟 최소 44px, 하단 고정 CTA, 가로 스크롤 금지. 눈으로 짐작하지 말고 **브라우저에서 실제 측정**할 것.
- **톤앤매너**: 존댓말 + "~해요체". 어르신·보호자가 읽기 쉽게. 전문용어는 풀어서 설명하거나 툴팁 제공.
- **파괴적 액션은 숨긴다.** 회원탈퇴는 화면 한참 아래 10px 흐린 글씨. 확인 단계에서 **큰 버튼 = 취소, 작은 텍스트 = 탈퇴**로 위계 반전.
- **정보 제공 시 정확성 우선.** 모르면 모른다고 하고 공식 출처로 연결.
- **로그인 게이트는 가치를 먼저 보여주고 걸 것.** 빈 화면이나 한 줄 안내 금지.
- **시터는 정보 중개만** (고용관계 아님) — `/terms/sitter`에 명시됨.
- **위치 권한**: 커스텀 모달 → 브라우저 네이티브 순서. 허용=localStorage(영구), "다음에"=sessionStorage(다음 방문 재요청). 한 번 제거했다가 사용자가 되돌리라고 했으니 다시 없애지 말 것.
- **로그아웃 시 로컬 데이터 삭제** (비교함·관심시설·검색조건·위치) — 공용 PC 대비.

### 4-3. 사용자와 합의된 기타
- 사업자등록번호는 **형식 검증만** (국세청 진위확인 API 불필요)
- 시설 사진: `facility.photos`가 있으면 로드뷰보다 자동 우선. 크롤링은 저작권 문제로 계속 거부
- 추천 시설은 `lib/promotedFacilities.ts` 배열로 수동 제어 (프리미엄 상품 판매 시 사용)

---

## 5. 아직 안 끝난 작업과 다음 할 일

### 5-1. 우선순위 높음

**① 요양시설(NHIS) 지역 데이터 누락 — 인천·전북·경북 (2026-07-31 해결됨)**
- 원인 확인: 기존 인천광역시.xlsx·전북특별자치도.xlsx·경상북도.xlsx 파일이 각각 대구·강원·충남 데이터로 잘못 채워져 있었음(파일명과 내용 불일치). 강원·충남 실데이터는 주소 필드로 파싱되어 이미 정상 반영돼 있었고, 진짜로 빠진 건 인천·전북·경북 3개뿐이었음
- 사용자가 longtermcare.or.kr에서 올바른 파일 재다운로드 → 인천 1,809 / 경북 1,879 / 전북 1,327건 등 총 5,017건 신규 추가
- 기존 22,857곳의 좌표(lat/lng)를 보존하기 위해 `prisma/seed.ts`의 delete-then-insert 대신 `scripts/add-new-nhis-facilities.mjs`(신규 id만 골라 추가)를 새로 만들어 사용 — **앞으로도 NHIS 데이터를 부분 갱신할 땐 이 스크립트를 쓸 것.** `prisma/seed.ts`의 `seedNhisV2()`를 그대로 돌리면 좌표가 전부 null로 초기화된다
- 신규분 지오코딩 완료(성공 4,840 / 실패 1,163 — 5-3의 ⑨번과 합류)
- 광주+전남은 `전남광주통합특별시`로 합쳐져 있음(2,365건) — 지역 페이지는 "전남·광주"로 처리해뒀음

**② 시설 평가 세부점수(evaluationDetail) — 22,000곳 중 3곳뿐**
- 시설 상세의 **오각형 레이더 차트**와 **전체 평균 대비 막대**가 이 데이터로 그려지는데, 실데이터가 없어 대부분 시설에서 안 보임 (현재는 "아직 공개되지 않았어요" 안내 표시)
- 사용자가 이 문제를 **세 번** 물어봤습니다. 코드 문제가 아니라 데이터 문제임을 이미 설명했음
- **해결 방법이 준비돼 있음**: `scripts/import-evaluations.mjs` 작성 완료. 사용자가 [공공데이터포털 "국민건강보험공단_장기요양기관 평가 결과"](https://www.data.go.kr/data/15104801/fileData.do)에서 파일을 받아 `C:\Users\linea\Desktop\장기요양 평가결과` 폴더에 넣으면 실행 가능
  ```bash
  node scripts/import-evaluations.mjs          # 미리보기
  node scripts/import-evaluations.mjs --write  # 반영
  ```

**③ 업체(기업) 가입 + 업체 구인글**
- 케어닥 스크린샷 폴더의 `기업가입1~3`에 해당. 아직 미구현
- 사용자가 예전에 "모심시터는 나중에 업체 구인글과 매칭시킬 용도"라고 함 → 자연스러운 다음 기능
- 사업자등록번호는 형식 검증만 하기로 합의됨

### 5-2. 중간 우선순위
4. **Prisma 정식 마이그레이션 도입** — 지금까지 `db push`만 사용, `prisma/migrations` 폴더 없음
5. **AUTH_SECRET 프로덕션 로테이션** — 로컬 개발용 값을 그대로 사용 중
6. **커스텀 도메인 연결** — 현재 `dolboda-rho.vercel.app` 서브도메인만
7. **알림 실제 발송 인프라** — `/notifications`는 UI만 있고 실제 푸시/문자/카톡 발송 없음. OAuth scope에 `talk_message`는 받아둠
8. **SEO 색인 상태 확인 (1~2주 뒤)** — 서치콘솔 "색인 생성 → 페이지"에서 색인 수가 늘고 있는지, 사이트맵 상태가 "성공"인지

### 5-3. 낮은 우선순위 / 데이터 품질
9. 지오코딩 실패 1,163건 재시도 (주소 정제 필요, 2026-07-31 기준 갱신)
10. HIRA 등급코드 완전 매핑 (`asmGrd10`만 확인, 나머지 7~8개 미사용)
11. SILVER_TOWN 실데이터 1건뿐 — NHIS 대상이 아니라 별도 소스 필요
12. HOME_CARE 정원 개념 없음(12,934곳이 정원=0) — UI에서 "입소 가능" 대신 "정원 개념 없음"으로 구분 표시하면 좋음
13. 시설 실사진 확보 — 100GB 분량 이야기가 나왔었음. `photos` 필드와 갤러리는 이미 준비됨. **원본 그대로 올리면 안 되고 WebP 리사이즈 → CDN 파이프라인 필요** (이 답변은 아직 못 드렸음)
14. 하이브리드 앱 전환 — 트래픽·전환 확정 전이라 보류하기로 사용자가 결정

---

## 6. 파일 구조 (주요 파일 역할)

```
app/
  page.tsx                        홈 (히어로배너7장·내주변·추천·등급우수·최근설립)
  services/page.tsx               ★ 돌봄 서비스 소개 (4종 비교)
  grade-test/page.tsx             ★ 장기요양등급 예상 테스트
  search/page.tsx                 시설 찾기 (필터·정렬·지도)
  facility/[id]/page.tsx          시설 상세
  facility/[id]/layout.tsx        시설 SEO 메타 + JSON-LD (서버)
  region/[sido]/...               ★ 지역 SEO 랜딩 3단계
  care-request/page.tsx           돌봄 요청 (보호자)
  care-request/confirmation/      돌봄 확인서 (인쇄용)
  compare/ favorites/ notifications/
  mypage/                         계정 설정 + 회원탈퇴
  mypage/sitter/register|profile|jobs|settlements|notifications
  api/facilities/                 목록(view=card)·상세·통계·nearby(서버 거리계산)
  api/care-requests/              요청 CRUD + open(시터용 목록)
  api/care-request-applications/  지원·확정·철회·mine
  api/sitter-profile/             시터 프로필·자격증
  robots.ts  sitemap.ts

components/
  Header Footer Logo HeroBanner SearchHero
  FacilityCard FacilityThumbnail FacilityPhotoGallery FilterBar
  KakaoMap KakaoRoadview DetailVisuals(GradeScaleBar·DomainRadar·ScoreCompareBar)
  CareRequestWizard CareRequestDetail CareRequestSignedOut CareFormFields DateRangeCalendar
  GradeTest ServicesShowcase CareServicesHero ApplyConfirmSheet
  MyPageShell AuthModal LocationConsentModal CompareSelectBar InfoTooltip

lib/
  types.ts facilityRepo.ts(rowToFacility·toCardFacility) useFacilities.ts prisma.ts
  careLocationTypes.ts careOptions.ts careRequestTypes.ts careRequestValidation.ts
  careServices.ts gradeTest.ts householdTasks.ts
  regionSeo.ts regionData.ts facilityTypeSeo.ts siteConfig.ts
  userLocation.ts signOutAndClear.ts distance.ts copay.ts
  compareContext favoritesContext viewGateContext alertPreferencesContext

scripts/
  import-nhis-v2.mjs        요양시설(엑셀 16개) → lib/realNhisDataV2.json
  import-hira-all.mjs       ★ 전국 요양병원 (--detail로 상세까지)
  import-evaluations.mjs    ★ 평가 세부점수 (파일 받으면 실행)
  geocode-db.mjs            카카오 지오코딩 (lat IS NULL만, 재실행하면 이어짐)
```

---

## 7. 개발 시 주의점 (실제로 겪은 함정들)

1. **`prisma generate` 후 dev 서버를 완전히 재시작해야 합니다.** `lib/prisma.ts`가 HMR용 글로벌 캐싱을 해서 재시작 전까지 새 필드를 못 봅니다. 이 세션에서만 4번 당했습니다.
2. **`ON CONFLICT ... DO UPDATE`에 컬럼을 빠뜨리지 마세요.** 요양병원 상세를 1,283곳 전부 API로 받아놓고 `extra`를 UPDATE 절에 안 넣어서 저장이 안 됐습니다. 한 번 더 실행해서 고쳤습니다.
3. **`html { scroll-behavior: smooth }`가 전역입니다.** `window.scrollTo({behavior:"auto"})`가 부드러운 스크롤로 해석돼 애니메이션 도중 화면이 바뀌면 위치가 어긋납니다. `behavior: "instant"`를 명시하세요.
4. **스크롤 앵커링** — 화면 높이가 바뀌면 브라우저가 스크롤을 되돌립니다. `useEffect` + `requestAnimationFrame`으로 두 번 맞춰야 정확히 0이 됩니다.
5. **Next.js `route.ts`에서는 핸들러 외 export가 금지**됩니다. 헬퍼는 `lib/`로 빼세요.
6. **루트 폰트가 18.5px**입니다(`globals.css`). Tailwind rem 값이 기본보다 15% 큽니다. `top-16`은 74px입니다.
7. 장시간 DB 스크립트는 Supabase 풀링 연결이 가끔 끊깁니다. 행 단위 저장 설계라 재실행하면 이어집니다.
8. 카카오 지오코딩을 병렬로 때리면 rate-limit으로 대량 실패합니다. 단일 워커로만.
9. `scripts/`의 수동 env 파서는 따옴표 제거(`.replace(/^"(.*)"$/, "$1")`)가 필요합니다.

---

## 8. 로그인 없이 세션 기능을 테스트하는 방법 (검증 필수 기법)

실제 카카오 OAuth 없이 테스트하는 확립된 방법입니다.

```js
// 1) DB에 Session 행 직접 삽입 (scripts/에 임시 .mjs 만들어 실행)
INSERT INTO "User" (id, name, email) VALUES ('test-user-caretype', '장테스트', 'test@example.com');
INSERT INTO "Session" (id, "sessionToken", "userId", expires)
  VALUES ('test-session', 'testtoken-caretype', 'test-user-caretype', '2027-01-01');

// 2) 브라우저에서 쿠키 설정
document.cookie = "authjs.session-token=testtoken-caretype; path=/; max-age=86400";

// 3) 검증이 끝나면 반드시 정리 (cascade로 전부 삭제됨)
DELETE FROM "User" WHERE id = 'test-user-caretype';
```

**주의**: 같은 브라우저에서 **두 번째 세션으로 전환은 안 됩니다**(HttpOnly 쿠키 재발급으로 JS가 못 덮음). 보호자·시터 양쪽이 필요하면 **같은 테스트 유저에게 SitterProfile을 추가**해서 한 계정으로 검증하세요.

---

## 9. 배포·인프라 메모

- **Vercel 환경변수**는 Settings → Environments → **Production** 안에 있습니다 (신 UI라 플랫 목록이 아님)
- `postinstall: prisma generate`가 package.json에 있어야 빌드 성공합니다
- **카카오 콘솔**: Redirect URI는 "플랫폼 키 → REST API 키" 아래, JS SDK 도메인은 "플랫폼 키 → JavaScript 키" 아래 (UI가 자주 바뀜). 비즈앱 전환 완료
- **중복 Vercel 프로젝트 주의**: 같은 저장소에 `dolboda-ijo1`이라는 프로젝트가 하나 더 붙어 있어 푸시마다 빌드 실패 메일이 왔습니다. 사용자가 삭제했습니다. 또 실패 메일이 오면 **프로젝트명을 먼저 확인**하세요 — `dolboda-rho`가 아니면 또 다른 중복입니다
- `git push`는 Git Credential Manager가 브라우저 인증을 요구할 때가 있습니다. 그때는 사용자가 실제 터미널에서 직접 push해야 합니다

---

## 10. 검증 절차 (커밋 전 체크리스트)

1. `npx tsc --noEmit` 통과
2. 브라우저(모바일 뷰포트 375px)에서 실제 동작 확인 — 짐작 금지
3. 가로 스크롤 없음: `document.documentElement.scrollWidth > window.innerWidth` 가 false
4. 44px 미만 터치 타겟 없음
5. 세션 기능은 8번 기법으로 흐름 전체 검증 후 **테스트 데이터 삭제**
6. 커밋 메시지는 한국어로 무엇을·왜 바꿨는지. 끝에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

## 11. 이번 대화의 커밋 이력 (최신순)

```
359c6b0 회원탈퇴 더 숨기고 확인 버튼 위계 반전
d447bcd 지원·등록 흐름 고도화 + 모바일·내부링크 정리
16c5499 비로그인 돌봄요청 빈 화면 수정 + 안내 화면 추가
b4f7ef9 전 화면 모바일 최적화 패스
f870014 목록 응답 61% 감소 + 서비스 비교표
b9d5a45 /services 돌봄 서비스 소개 페이지
5f013da 헤더 순서 변경 + 필터 드롭다운 스타일 통일
e3c0deb 등급 테스트 스크롤 최상단 고정 (앵커링 대응)
c189a53 등급 테스트 시작 시 최상단 이동
fa57e3b 등급 테스트 메뉴 강조 + 요양병원 0등급 표시 수정
5f4b7f0 등급 테스트 결과 로그인 게이트(블러)
33408e9 전국 요양병원 1,283곳 임포트 + 등급 테스트 다듬기
8b7f4eb 장기요양등급 예상 테스트 신규
589fe3a 히어로 배너 속도 개선 + 검색 거리순 수정
a8e52cd 평가 세부점수 임포트 스크립트
0af2c51 시터 일자리 탭 CTA
4ddf76f 커스텀 날짜 범위 달력
a9e853d 돌봄 요청 모바일 다듬기
8b1f5ce 돌봄 요청 케어닥 수준으로 고도화 + 로그아웃/위치 버그 수정
4f824da 지역×유형 롱테일 랜딩 566개
61a6866 PC UX 버그 8건 수정
e38dc85 지역 SEO 랜딩 + 구조화 데이터 + OG + llms.txt
39c9be0 돌봄 유형 3종 + 돌봄 확인서 + SEO 기반
```

---

## 12. 참고자료 — 케어닥 스크린샷 (재전송 불필요)

전부 바탕화면 `C:\Users\linea\Desktop\케어닥 모바일 구인구직\` 아래에 있습니다.

| 폴더 | 내용 |
|---|---|
| `1-30`, `31-50`, `51-55` | 보호자 간병 신청 흐름 55장 (돌봄 요청 원본) |
| `케어닥` | 케어코디(시터) 등록·프로필·일자리 관리 + **기업가입 3장(미구현)** |
| `모바일 필터, 병원` | 공고 목록·필터·정렬 14장 |
| `모바일 가사돌봄` | 가사돌봄 신청 8장 |
| `모바일 집에서` | 자택 돌봄 6장 |
| `모바일 모심시터 신청서 계약서 PDF 자동생성` | 계약서 자동생성 16장 (우리는 "돌봄 확인서"로 대체) |
| `지원하기 했을떄 주민번호 필요` | 주민번호 요구 8장 (우리는 수집 안 함) |

케어닥 주요 URL: `/services`(공고 목록), `/test/physical`(등급 테스트), `/main/cntnts/test`

---

## 13. 새 세션 시작 시 권장 첫 마디

> "HANDOVER.md 읽고 이어서 작업해줘. 오늘은 [하고 싶은 일]부터."

우선순위를 정해달라고 하면 **5-1의 ①②③** 순서로 제안하면 됩니다.
