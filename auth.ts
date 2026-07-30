import NextAuth from "next-auth";
import Kakao from "next-auth/providers/kakao";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    Kakao({
      clientId: process.env.AUTH_KAKAO_ID,
      clientSecret: process.env.AUTH_KAKAO_SECRET,
      // talk_message: "나에게 보내기"류 카카오톡 메시지 발송 권한도 로그인 시 같이 동의받음
      // Kakao 기본 authorization은 문자열이라 params만 override하면 url이 통째로 날아가버림
      // (Auth.js merge가 string↔object 타입 불일치 시 새 값으로 덮어씀) — url을 같이 명시해야 함
      authorization: {
        url: "https://kauth.kakao.com/oauth/authorize",
        params: { scope: "profile_nickname talk_message" },
      },
    }),
  ],
});
