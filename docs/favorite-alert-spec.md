# 찜 알림 (관심시설 빈자리·등급 변경) 설계

> 최종 갱신: 2026-08-03
> 관련 코드: `lib/favoritesContext.tsx` · `lib/alertPreferencesContext.tsx` ·
> `app/notifications/page.tsx` · `scripts/daily-nhis-sync.mjs` · `prisma/schema.prisma`

## 0. 한 줄 요약

**보낼 내용은 매일 준비되는데, 받을 사람 명단이 서버에 없어서 알림이 나가지 못한다.**
명단(찜·알림설정)을 DB로 올리면 이미 돌고 있는 일일 수집과 붙어 바로 알림이 된다.

---

## 1. 지금 상태 (2026-08-03 실측)

### 1-1. 이미 되어 있는 것 — 알림의 "내용"

`scripts/daily-nhis-sync.mjs`가 매일 공단 데이터를 받아 **어제와 다른 시설만** 골라낸다.
그 과정에서 이미 두 가지 사건을 정확히 감지하고 있다:

| 사건 | 감지 조건 (스크립트에 이미 있음) |
|---|---|
| 빈자리 생김 | 어제는 `occupancy >= capacity`(만실)였는데 오늘 `currentOccupancy < capacity` |
| 평가등급 변동 | `cur.grade !== f.grade` |

**그런데 지금은 이 값을 콘솔 로그로만 찍고 끝난다**(`vacancyOpened++`, `gradeChanges.push(...)`).
누구에게도 전달되지 않는다.

`FacilitySnapshot` 적재도 정상 작동 중이다 — **27,498행**(8/2 기준선 27,493건 + 8/3 변경분 5건).
변경분만 쌓는 설계라 앞으로도 하루 수백 행 수준으로 유지된다.

### 1-2. 비어 있는 것 — 알림의 "수신자"

| 데이터 | 현재 저장 위치 | 문제 |
|---|---|---|
| 관심시설(찜) | `localStorage["mosim-favorite-ids"]` | 서버가 모름 |
| 시설별 알림 설정 | `localStorage["mosim-alert-prefs"]` | 서버가 모름 |
| 관심 지역 | `localStorage["mosim-region-interests"]` | 서버가 모름 |

이 때문에 생기는 일:

1. **알림을 보낼 수 없다.** 서버가 "누가 어느 시설을 찜했는지" 모른다.
2. **기기를 바꾸면 찜 목록이 사라진다.** 로그인해도 복구되지 않는다.
3. **화면과 저장이 어긋나 있다.** `/notifications`는 로그인을 요구하는데(로그인 안 하면
   "알림은 로그인 후 이용할 수 있어요") 정작 저장은 브라우저에만 한다 — 로그인의 의미가 없다.

### 1-3. 발송 수단

푸시는 **전혀 구현돼 있지 않다** (web-push·FCM·service worker 모두 없음).
이메일은 Resend가 이미 붙어 있어(`lib/resend.ts`) 바로 쓸 수 있다.

---

## 2. 데이터 모델

### 2-1. 찜과 알림 설정을 한 행에 둔다

```prisma
// 관심시설(찜) + 그 시설에 대한 알림 설정.
//
// 찜과 알림을 별도 테이블로 나누지 않는 이유: 화면(app/notifications)이 이미
// "찜한 시설에만 알림을 걸 수 있다"는 구조다. 찜 없이 알림만 있는 상태가 없으므로
// 테이블을 나누면 항상 조인해야 하고, 찜을 지울 때 알림 설정 고아 행이 남는다.
model FacilityFavorite {
  id         String @id @default(cuid())
  userId     String
  user       User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  facilityId String

  // 알림 스위치 — 기본은 둘 다 꺼둔다(찜은 "저장"이지 "알림 신청"이 아니다)
  vacancyAlert     Boolean @default(false)
  gradeChangeAlert Boolean @default(false)

  createdAt DateTime @default(now())

  @@unique([userId, facilityId])
  // "이 시설에 자리가 났다 → 누구에게 보낼까"를 시설 기준으로 훑는 인덱스.
  // 알림 발송은 사용자가 아니라 **시설에서 출발**하기 때문에 이 방향이 맞다.
  @@index([facilityId, vacancyAlert])
  @@index([userId])
}

// 관심 지역 — 시설과 달리 대상이 특정되지 않아 별도 테이블로 둔다.
model RegionInterest {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  // lib/regionSeo.ts의 시도 slug (예: "경남")
  region    String
  createdAt DateTime @default(now())

  @@unique([userId, region])
  @@index([region])
}

// 보낸 알림 기록 — 같은 사건을 두 번 보내지 않기 위한 것이자 발송 이력이다.
//
// ⚠️ 이 표가 없으면 수집이 재실행될 때(수동 재시도·부분 실패 복구) 같은 알림이
// 다시 나간다. 알림은 되돌릴 수 없으므로 중복 방지는 선택이 아니다.
model AlertDelivery {
  id         String   @id @default(cuid())
  userId     String
  facilityId String
  // "vacancy" | "gradeChange"
  kind       String
  // 사건이 감지된 수집일 (YYYY-MM-DD, KST) — 하루 한 사건당 한 번만 보낸다
  date       String
  channel    String   // "email" | "push"
  sentAt     DateTime @default(now())

  @@unique([userId, facilityId, kind, date])
  @@index([sentAt])
}
```

### 2-2. 왜 스냅샷을 다시 안 보고 수집 시점에 판단하는가

`FacilitySnapshot`을 나중에 비교해 사건을 뽑을 수도 있지만, **수집 스크립트가 이미
그 판단을 하고 있다**(§1-1). 같은 판정을 두 곳에서 하면 기준이 갈라진다.
수집 시점에 감지한 사건을 그대로 넘기는 쪽이 맞다.

---

## 3. localStorage → 서버 이전

기존 사용자의 찜 목록을 잃지 않는 것이 이 작업의 유일한 위험 지점이다.

### 이전 방식: 로그인 시 1회 병합(merge), 삭제는 하지 않는다

```
로그인 감지
  → localStorage에 찜 목록이 있고, 아직 서버로 안 올린 표식이면
  → POST /api/favorites/import { facilityIds, prefs, regions }
  → 서버는 upsert만 한다(있으면 두고, 없으면 만든다). 서버에 있는데
     로컬에 없는 항목은 지우지 않는다 — 다른 기기에서 찜한 것일 수 있다
  → 성공하면 localStorage에 "이전 완료" 표식을 남긴다
```

**지우지 않고 병합만 하는 이유**: 로컬을 정답으로 삼아 동기화하면, 새 기기에서 처음
로그인했을 때 빈 로컬이 서버의 찜 목록을 통째로 지운다. 되돌릴 수 없는 손실이라
"합치기만" 한다.

### 비로그인 사용자

찜 자체는 계속 localStorage로 동작시킨다(로그인을 강요하면 이탈한다).
다만 알림 스위치는 로그인해야 켜지게 한다 — 보낼 주소가 없으면 의미가 없기 때문이고,
이미 `/notifications`가 그렇게 안내하고 있다.

---

## 4. 발송

### 4-1. 흐름

```
daily-nhis-sync.mjs (매일 새벽)
  → 변경 감지 (빈자리 / 등급 변동)  ← 이미 있음
  → 사건 목록을 알림 큐로 넘김       ← 신설
  → 시설별로 FacilityFavorite에서 수신자 조회 (vacancyAlert=true)
  → AlertDelivery로 중복 걸러내기
  → 발송 + AlertDelivery 기록
```

### 4-2. 채널 순서

| 단계 | 채널 | 근거 |
|---|---|---|
| 1 | 이메일 | Resend가 이미 붙어 있어 추가 의존성 0. 오늘 바로 가능 |
| 2 | 웹푸시 | 안드로이드 크롬은 잘 된다. iOS Safari는 **홈화면 추가한 경우에만** 되어 반쪽 |
| 3 | 앱 푸시(FCM) | 앱 래핑 이후. iOS까지 확실히 닿는 유일한 경로 |

**1단계만으로도 리텐션 효과는 나온다.** 푸시를 기다릴 이유가 없다.

⚠️ 카카오 로그인은 이메일 제공 동의가 꺼져 있으면 이메일을 주지 않는다(운영자 계정이
실제로 그랬다 — `lib/admin.ts` 주석 참고). 이메일이 없는 계정은 **발송 대상에서 조용히
빠지고**, 알림 설정 화면에 "알림을 받으려면 이메일이 필요해요" 안내를 띄워야 한다.

### 4-3. 보낼 내용의 절제

빈자리 알림은 **사실만** 전한다: 시설명 / 정원 대비 현재 인원 / 확인 링크.
"지금 연락하세요" 같은 재촉 문구는 넣지 않는다 — 공공데이터 기준이라 실제와 다를 수
있고(수집 시점 차이), 재촉했다가 헛걸음하면 신뢰를 한 번에 잃는다.
메일 본문에 **"공공데이터 기준이며 실제 입소 가능 여부는 시설에 확인이 필요해요"**를
반드시 함께 적는다.

---

## 5. 법적 고려

- 본인이 직접 켠 알림이라 **광고성 정보가 아니라 서비스성 정보**다.
  다만 수신거부 경로는 반드시 있어야 한다(메일 하단 링크 + 알림 설정 화면).
- `lib/emailOptOut.ts`가 이미 있으나 그건 **시설 대상** 수신거부다.
  이용자 알림은 `FacilityFavorite`의 스위치를 끄는 것이 곧 수신거부이므로,
  메일의 수신거부 링크는 알림 설정 화면으로 보내면 된다.
- 개인정보처리방침(`app/privacy/page.tsx`)의 수집 항목에 **관심시설·관심지역·알림 설정**을
  추가해야 한다. 지금은 localStorage라 수집 항목이 아니었지만, 서버 저장으로 바뀌면
  수집이 된다.

---

## 6. 구현 순서

각 단계가 그것만으로도 가치가 있게 쪼갰다.

| 단계 | 내용 | 그 자체의 가치 |
|---|---|---|
| 1 | `FacilityFavorite`·`RegionInterest` 모델 + 찜 API + 로그인 시 병합 | **기기 바꿔도 찜이 남는다** (알림 없이도 이득) |
| 2 | 알림 설정 스위치를 서버에 저장 | 설정이 유지된다 |
| 3 | `AlertDelivery` + 수집 스크립트에서 사건 → 이메일 발송 | **빈자리 알림 동작 시작** |
| 4 | 관심 지역 신규 시설 알림 | 찜한 시설이 없는 사용자도 받을 것이 생긴다 |
| 5 | 웹푸시 → 앱 FCM | 도달률 향상 |

**1단계만 해도 지금의 "기기 바꾸면 찜이 사라진다"는 손실이 사라진다.**

---

## 7. 발송 정책 (2026-08-03 확정·구현 완료)

| 항목 | 결정 | 구현 |
|---|---|---|
| **발송 시각** | **오전 9시(KST)** | 수집(새벽 4시)과 워크플로를 분리했다. 새벽 메일은 알림음이 울려 불쾌하고 열람률도 낮다 |
| **묶어 보내기** | **사람당 한 통** | 시설마다 따로 보내면 여러 곳 찜한 사람이 아침에 메일 폭탄을 맞는다. 사건 7건 → 1통 실측 확인 |
| **등급 하락** | **보낸다 (문구를 구분)** | "올랐어요" / "내려갔어요"로 방향을 명시. 같은 문구면 보호자가 방향을 오해한다. 내려간 경우가 오히려 더 알아야 할 소식이다 |
| **최소 간격** | **같은 시설 7일** | 만실↔여유를 오가는 시설이면 매일 알림이 가서 결국 알림을 꺼버린다. `sentAt` 기준이라 **실제로 보낸 것만** 카운트한다 |

### 구현 위치

- `scripts/send-facility-alerts.mjs` — 사건 판정·수신자 조회·발송
- `.github/workflows/send-facility-alerts.yml` — 매일 09:00 KST (수동 실행 시 날짜 지정 가능)
- `AlertDelivery` — 중복 방지. **발송 전에** 행을 만들고 unique 제약을 잠금으로 쓴다

### 8. 이메일 없는 계정 (2026-08-04 구현 완료)

카카오 로그인은 이메일 제공 동의가 꺼져 있으면 이메일을 안 준다. `/notifications`에
경고 배너를 띄우고, 카카오로 재로그인하면 이번엔 이메일이 실제로 채워지도록
`auth.ts`의 `signIn` 콜백을 고쳤다(Auth.js는 재로그인 시 DB의 기존 User 행을
그대로 쓰고 갱신하지 않는다는 걸 소스에서 확인했다 — 배너만 있으면 안내가
거짓말이 될 뻔했다). 이미 있는 이메일은 덮어쓰지 않는다.

### 9. 관심 지역 신규 시설 알림 (2026-08-04 구현 완료)

`scripts/send-facility-alerts.mjs`에 세 번째 사건 판정을 추가했다: `Facility.createdAt`이
오늘(KST)인 시설을 찾아, 주소에서 시/도를 뽑아 `RegionInterest`에 그 지역을 등록한
사람 전원에게 보낸다(시설별 온오프 스위치가 없어 지역당 하나로 충분하다).

- **왜 별도 스크립트가 아니라 같은 스크립트에 넣었나** — "사람당 메일 한 통" 원칙을
  지키려면 빈자리·등급변동·신규등록 세 사건을 같은 `byUser` 묶음에 넣어야 한다.
  워크플로를 하나 더 만들면 같은 아침에 메일이 두 통 갈 수 있다.
- **지역 매핑이 두 갈래로 나뉘어 있는 문제** — `lib/regions.ts`의 `REGIONS`(17개, 광주·전남
  분리)와 `lib/regionSeo.ts`의 `REGION_SEO`(16개, "전남·광주" 통합)가 서로 다르다.
  `RegionInterest.region`은 `REGIONS` 표기를 쓰므로, 스크립트 안에 `REGION_PREFIXES`를
  별도로 두고 주소 → `REGIONS` 라벨로 직접 매핑한다(`app/api/sitter/workplaces/route.ts`의
  `prefixesFor`와 같은 문제, 같은 해법 — 그쪽은 TS라 이 순수 node 스크립트에서
  import할 수 없어 중복해서 둔다).
- **쿨다운 없음** — 한 시설이 "신규"인 날은 평생 딱 하루뿐이라 매일반복될 걱정이 없다.
  `AlertDelivery`의 unique 제약이 재실행 중복은 그대로 막는다.
- **검증**: 실제 DB에서 대량 시설이 생성된 날짜(2026-07-30, 23,817곳)로 드라이런해
  날짜 경계·지역 매핑이 올바른지 확인(주소에 시/도가 아예 없는 35건만 정상적으로
  건너뜀). `Facility.createdAt`이 `timestamp without time zone` 컬럼이라 SQL의
  `AT TIME ZONE`으로 어설프게 확인하면 오히려 틀린 결과가 나온다는 것도 이 과정에서
  확인했다 — JS Date 산술(±9시간)로 직접 UTC 경계를 계산하는 지금 방식이 맞다.

### 아직 남은 것

- **웹푸시 → 앱 FCM**
