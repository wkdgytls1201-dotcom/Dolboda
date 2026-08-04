import NextAuth from "next-auth";
import Kakao from "next-auth/providers/kakao";
import Naver from "next-auth/providers/naver";
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
    // 카카오는 최초 로그인 때 "이메일 제공"에 동의하지 않으면 계정에 이메일이 영영 안
    // 남는다. 문제는 나중에 동의를 켜고 재로그인해도 Auth.js가 기존 User 행을 그대로
    // 쓰고 갱신하지 않는다는 것(@auth/core의 handle-login.js — 이미 연결된 계정으로
    // 재로그인하면 DB에 있던 값을 그대로 반환하고 끝낸다). 그래서 여기서 이메일이 없을
    // 때만 새로 받아온 프로필의 이메일로 채운다 — 이미 있는 이메일은 절대 덮어쓰지 않는다
    // (다른 소셜 계정으로 이메일을 바꿔치기하는 계정 탈취를 막기 위해).
    // signIn 콜백은 handleLoginOrRegister가 DB를 다시 조회하기 전에 실행되므로, 여기서
    // 업데이트하면 같은 로그인 요청 안에서 바로 세션·JWT에 반영된다(재로그인 두 번 필요 없음).
    async signIn({ user, account, profile }) {
      if (account?.provider === "kakao" && !user.email && user.id) {
        const kakaoEmail = (profile as { kakao_account?: { email?: string } } | undefined)
          ?.kakao_account?.email;
        if (kakaoEmail) {
          await prisma.user.update({ where: { id: user.id }, data: { email: kakaoEmail } }).catch(() => {});
        }
      }
      return true;
    },
    // 최초 로그인 때만 user·account가 들어온다 — 그때 id와 로그인 수단을 토큰에 새겨두고
    // 이후엔 토큰만 읽는다. provider를 넣는 이유: jwt 전략이라 세션에 DB 조회가 없어서
    // 마이페이지가 "무엇으로 로그인했는지"를 알 방법이 이것밖에 없다.
    jwt({ token, user, account }) {
      if (user?.id) token.id = user.id;
      if (account?.provider) token.provider = account.provider;
      return token;
    },
    session({ session, token }) {
      // sub는 Auth.js가 기본으로 채우는 사용자 식별자 — id가 없을 때의 안전망
      const id = (token.id as string | undefined) ?? token.sub;
      if (id) session.user.id = id;
      // 구글 추가(2026-08-03) 이전에 발급된 토큰에는 provider가 없다 — 그땐 카카오뿐이었다
      session.user.provider = (token.provider as string | undefined) ?? "kakao";
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
    // 네이버를 붙인 이유는 이메일이다. 카카오는 "이메일 제공 동의"가 꺼져 있으면 이메일을
    // 아예 주지 않아서, 찜 알림을 보낼 주소가 없는 계정이 생긴다. 네이버는 개발자센터에서
    // 이메일을 '필수' 제공 항목으로 설정할 수 있다(설정 안 하면 카카오와 같은 문제가 난다).
    Naver({
      clientId: process.env.AUTH_NAVER_ID,
      clientSecret: process.env.AUTH_NAVER_SECRET,
      // 같은 이메일의 카카오 계정이 이미 있으면 그 계정에 연결한다. 끄면 Auth.js가
      // OAuthAccountNotLinked 에러 화면으로 보내는데, 사용자는 "왜 로그인이 안 되지"만
      // 남고 스스로 복구할 방법이 없다(계정 연결 UI가 없으므로).
      allowDangerousEmailAccountLinking: true,
    }),
  ],
});
