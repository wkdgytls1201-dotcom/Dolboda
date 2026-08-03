import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      /** 로그인에 쓴 소셜 제공자("kakao" | "google"). auth.ts의 jwt 콜백이 채운다. */
      provider?: string;
    } & DefaultSession["user"];
  }
}
