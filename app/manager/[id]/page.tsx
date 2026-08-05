import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, BadgeCheck, CalendarCheck, MapPin, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { jsonLdHtml } from "@/lib/jsonLd";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";

// 매니저 공개 프로필 — 매니저의 "돌보다 실적 명함".
//
// 왜 만들었나(리텐션 제안 4번): 완료 건수·보호자 평점은 자기 신고 경력과 달리 플랫폼이
// 매칭 기록으로 보증하는 숫자다. 이 숫자가 공유 가능한 URL이 되면 매니저의 커리어 자산이
// 돌보다에 쌓인다 — 실적을 들고 떠날 수 없으니 계속 활동할 이유가 된다.
//
// 공개 원칙:
//  - publicProfileAt이 있는(매니저가 직접 켠) 프로필만 열린다. 아니면 404.
//  - 실명·연락처·계좌·국적은 절대 싣지 않는다. 닉네임·경력·자격증·활동지역·실적만.
//  - 보호자 후기 "본문"도 싣지 않는다 — 후기는 플랫폼 안에서 쓰인 글이라 공개 전시에
//    보호자가 동의한 적 없다. 집계(평점·건수)만 보여준다.

// 실적 숫자만 보면 시간 단위 신선도면 충분하지만, "공개 끄기"(동의 철회)가 캐시에 최대
// 1시간 남는 건 곤란하다 — 끄면 1분 안에 내려가도록 짧게 잡는다(조회 2건이라 부담 없음).
export const revalidate = 60;

async function getPublicManager(id: string) {
  const profile = await prisma.sitterProfile.findUnique({
    where: { id },
    select: {
      id: true,
      nickname: true,
      photoUrl: true,
      intro: true,
      experienceYears: true,
      regions: true,
      createdAt: true,
      publicProfileAt: true,
      certifications: { select: { id: true, name: true, issuedBy: true } },
    },
  });
  if (!profile || !profile.publicProfileAt) return null;

  const [completedCount, review, logDayCount] = await Promise.all([
    prisma.careRequestApplication.count({
      where: { sitterProfileId: id, status: "돌봄완료" },
    }),
    prisma.careReview.aggregate({
      where: { sitterProfileId: id },
      _count: { _all: true },
      _avg: { rating: true },
    }),
    // 돌봄일지 기록일 수 — 원본만 센다(하루 1원본 가드 덕에 곧 "기록한 날 수")
    prisma.careLog.count({
      where: { sitterProfileId: id, correctsId: null },
    }),
  ]);

  return {
    profile,
    completedCount,
    reviewCount: review._count._all,
    avgRating: review._avg.rating != null ? Math.round(review._avg.rating * 10) / 10 : null,
    logDayCount,
  };
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const data = await getPublicManager(params.id);
  // 여기(스트리밍 시작 전)서 던져야 HTTP 상태가 진짜 404가 된다 — 본문 렌더 중의
  // notFound()는 이미 전송된 200을 바꾸지 못한다(실측: 없는 id가 200으로 나왔다).
  if (!data) notFound();
  const { profile } = data;
  return {
    title: `${profile.nickname} 매니저 — 돌보다 실적 프로필`,
    description: `경력 ${profile.experienceYears}년 · 돌보다 완료 ${data.completedCount}건 · ${
      profile.regions.join("·") || "전국"
    } 활동. 돌보다가 실제 매칭 기록으로 확인한 돌봄 매니저 실적이에요.`,
    alternates: { canonical: `/manager/${profile.id}` },
  };
}

export default async function ManagerPublicProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getPublicManager(params.id);
  if (!data) notFound();
  const { profile, completedCount, reviewCount, avgRating, logDayCount } = data;
  const sinceYear = profile.createdAt.getFullYear();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.nickname,
    jobTitle: "돌봄 매니저",
    url: `${SITE_URL}/manager/${profile.id}`,
    worksFor: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <main className="mx-auto max-w-md px-4 py-8 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />

      {/* 헤더 — 사진·활동명·경력 */}
      <div className="mb-5 flex items-center gap-4">
        {profile.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.photoUrl}
            alt=""
            className="h-20 w-20 shrink-0 rounded-full bg-ink-100 object-cover"
          />
        ) : (
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary-100 text-2xl font-extrabold text-primary-600">
            {profile.nickname.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0">
          <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-mint-100 px-2.5 py-0.5 text-[11px] font-bold text-mint-700">
            <BadgeCheck size={12} aria-hidden />
            돌보다 활동 매니저
          </span>
          <h1 className="text-xl font-extrabold leading-snug text-ink-900">
            {profile.nickname} 매니저
          </h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-500">
            <span>경력 {profile.experienceYears}년</span>
            <span>{sinceYear}년부터 활동</span>
            {profile.regions.length > 0 && (
              <span className="flex items-center gap-0.5">
                <MapPin size={12} aria-hidden />
                {profile.regions.join(" · ")}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* 실적 패널 — 이 페이지의 핵심. 자기 신고가 아니라 플랫폼 기록이라는 걸 명시한다 */}
      <section className="mb-5 rounded-2xl bg-white shadow-card">
        <div className="grid grid-cols-3 divide-x divide-ink-100">
          <div className="flex flex-col items-center px-1 py-4 text-center">
            <CalendarCheck size={16} className="mb-1.5 text-primary-400" aria-hidden />
            <p className="text-lg font-extrabold text-primary-600">{completedCount}건</p>
            <p className="mt-0.5 text-[11px] text-ink-500">돌봄 완료</p>
          </div>
          <div className="flex flex-col items-center px-1 py-4 text-center">
            <Star size={16} className="mb-1.5 text-accent-400" aria-hidden />
            <p className="text-lg font-extrabold text-primary-600">
              {avgRating != null ? `★ ${avgRating}` : "—"}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-500">보호자 평점{reviewCount > 0 ? ` (${reviewCount})` : ""}</p>
          </div>
          {/* 활동 시작 연도는 헤더로 올리고, 이 칸은 일지 기록일로 — "기록을 성실히
              남기는 매니저"가 더 강한 신뢰 신호다(2026-08-05 사용자 지시). */}
          <div className="flex flex-col items-center px-1 py-4 text-center">
            <Award size={16} className="mb-1.5 text-royal-400" aria-hidden />
            <p className="text-lg font-extrabold text-primary-600">{logDayCount}일</p>
            <p className="mt-0.5 text-[11px] text-ink-500">돌봄일지 기록</p>
          </div>
        </div>
        <p className="flex items-center justify-center gap-1.5 rounded-b-2xl border-t border-mint-100 bg-mint-50/60 py-2.5 text-center text-xs font-bold text-mint-700">
          <BadgeCheck size={14} aria-hidden />
          돌보다가 실제 매칭 기록으로 확인한 실적이에요
        </p>
      </section>

      {completedCount === 0 && (
        <p className="mb-5 rounded-2xl bg-ink-100/40 px-4 py-3 text-sm leading-relaxed text-ink-500">
          아직 돌보다에서의 첫 돌봄 전이에요. 완료된 돌봄과 보호자 후기가 생기면 이 자리에
          실적으로 쌓여요.
        </p>
      )}

      {profile.intro && (
        <section className="mb-5 rounded-2xl border border-ink-100 bg-white p-5">
          <h2 className="mb-2 text-sm font-bold text-ink-900">소개</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">{profile.intro}</p>
        </section>
      )}

      {profile.certifications.length > 0 && (
        <section className="mb-5 rounded-2xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-900">자격증</h2>
          <ul className="space-y-2">
            {profile.certifications.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-sm text-ink-700">
                <Award size={14} className="shrink-0 text-primary-400" aria-hidden />
                <span className="min-w-0">
                  {c.name}
                  {c.issuedBy && <span className="text-ink-300"> · {c.issuedBy}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 보는 사람(보호자)을 위한 다음 걸음 — 이 페이지는 매니저가 공유해서 도달하는 화면이라
          "돌보다에서 이런 분들과 매칭된다"가 자연스러운 결론이다 */}
      <Link
        href="/care-request"
        className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-primary-500 text-base font-bold text-white shadow-soft transition-all duration-200 ease-snappy hover:bg-primary-600 active:scale-[0.99]"
      >
        돌봄 요청하고 매니저 지원받기
      </Link>
      <p className="mt-3 text-center text-xs leading-relaxed text-ink-300">
        실명·연락처는 공개되지 않아요. 매칭이 확정된 보호자에게만 안내돼요.
      </p>
    </main>
  );
}
