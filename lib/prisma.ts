import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Next.js dev 모드 핫리로드 시 커넥션이 계속 새로 생기는 걸 막기 위한 전역 캐시 패턴
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// 앱 런타임 쿼리는 트랜잭션모드 풀러(6543, DATABASE_URL) 사용 — 서버리스/동시요청에 적합
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
