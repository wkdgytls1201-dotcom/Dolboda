# 마이그레이션 베이스라인 — 아직 전환 전

> 작성: 2026-08-05 · 상태: **베이스라인 파일만 생성됨. 워크플로는 여전히 `db push`.**

`0_init/migration.sql`은 2026-08-05 시점 스키마 전체를 SQL로 뜬 것이다.
같은 날 `prisma migrate diff --from-config-datasource --to-schema`로 **프로덕션 DB와
스키마 사이 드리프트 0**을 확인했으므로, 이 파일은 그 시점의 실DB와 정확히 일치한다.

## 왜 만들었나

지금까지 스키마 변경을 전부 `db push`로 해와서 마이그레이션 이력이 없다. 이 상태로는
① 롤백 수단이 없고 ② 스키마에 못 적는 DB 객체(부분 유니크 인덱스 등)를 만들 수 없다
(다음 push가 소리 없이 지운다 — 14차 §3-2에서 실제로 이 제약 때문에 advisory lock으로
우회했다). 베이스라인은 나중에 `migrate` 체제로 갈아탈 때의 출발점이다.

## 정식 전환 절차 (사용자 승인 후에만 — 아직 실행하지 말 것)

1. `npx prisma migrate resolve --applied 0_init` — 프로덕션 DB에 `_prisma_migrations`
   테이블을 만들고 베이스라인을 "이미 적용됨"으로 표시한다(데이터 변경 없음).
2. 이후 스키마 변경은 `db push` 대신 `npx prisma migrate dev --name <이름>`으로.
3. 배포 파이프라인(또는 수동)에서 `npx prisma migrate deploy`.

**전환 전까지는 지금처럼 `db push`를 계속 써도 된다** — 이 폴더의 존재는 push에
아무 영향이 없다. 단, 전환 전에 스키마가 또 바뀌면 이 베이스라인은 낡는다.
그 경우 0_init을 다시 뜨면 된다(같은 diff 명령).
