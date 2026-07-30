import { config } from "dotenv";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

config({ path: path.resolve(__dirname, ".env.local") });

// db push/migrate 등 CLI 작업은 세션모드(직결) URL 사용 — pgbouncer 트랜잭션 풀러는
// 스키마 변경(DDL)에 제약이 있어서 DIRECT_URL(5432)을 씀.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
