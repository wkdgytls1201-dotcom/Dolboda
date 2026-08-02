import NextAuth from "next-auth";
import Kakao from "next-auth/providers/kakao";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // PrismaAdapter는 JWT 전략에서도 그대로 필요하다 — 카카오 계정 연결(Account)과
  // 사용자 레코드(User)를 만드는 건 어댑터가 한다. 알림 발송에 쓸 카카오 access_token도
  // 계속 Account 테이블에 저장된다.
  adapter: PrismaAdapter(prisma),
  // database → jwt 전환(2026-08-02). database 전략은 auth()를 부를 때마다 세션 테이블을
  // 조회해서, 로그인 사용자의 API가 인증 없는 API보다 25~50배 느렸다(실측:
  // 인증 없는 API 20~30ms vs 인증 필요 API 570~1,660ms). jwt는 서명된 쿠키만 읽어
  // DB 왕복이 사라진다.
  //
  // 맞바꾼 것: 서버가 특정 세션을 즉시 무효화할 수 없다(강제 로그아웃 불가). 회원 탈퇴
  // 시에도 토큰 자체는 만료 전까지 유효한데, 탈퇴 화면이 곧바로 signOut을 호출하고
  // (lib/signOutAndClear.ts) User 행이 지워져 그 id로는 조회해도 아무것도 안 나오며
  // 새 데이터 생성은 외래키 제약에 막힌다.
  session: { strategy: "jwt" },
  callbacks: {
    // 최초 로그인 때만 user가 들어온다 — 그때 id를 토큰에 새겨두고 이후엔 토큰만 읽는다
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      // sub는 Auth.js가 기본으로 채우는 사용자 식별자 — id가 없을 때의 안전망
      const id = (token.id as string | undefined) ?? token.sub;
      if (id) session.user.id = id;
      return session;
    },
  },
  providers: [
    Kakao({
      clientId: process.env.AUTH_KAKAO_ID,
      clientSecret: process.env.AUTH_KAKAO_SECRET,
      // talk_message: "나에게 보내기"류 카카오톡 메시지 발송 권한도 로그인 시 같이 동의받음
      // Kakao 기본 authorization은 문자열이라 params만 override하면 url이 통째로 날아가버림
      // (Auth.js merge가 string↔object 타입 불일치 시 새 값으로 덮어씀) — url을 같이 명시해야 함
      authorization: {
        url: "https://kauth.kakao.com/oauth/authorize",
        params: { scope: "profile_nickname account_email talk_message" },
      },
    }),
  ],
});
