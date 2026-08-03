"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Briefcase, HeartHandshake, Settings, User } from "lucide-react";
import { useSitterProfileContext } from "@/lib/sitterProfileContext";
import { useMyPageRole } from "@/lib/mypageRoleContext";

// 마이페이지 상단 역할 카드 — 보호자 ↔ 돌보다 매니저.
//
// 위 세그먼트로 고르고, 아래 신분증 카드가 뒤집히며 따라온다. 전환 수단(세그먼트)과
// 피드백(뒤집기)을 나눈 이유: 카드 자체를 눌러 뒤집게 하면 "여기를 누르면 뒤집힌다"를
// 아무도 모른다. 세그먼트는 지금 어느 쪽인지도 같이 알려준다.
//
// 앞·뒷면은 **같은 골격**(아바타 줄 + 버튼 2개)으로 맞췄다. 뒷면은 absolute라
// 높이를 못 만들기 때문에, 구조가 다르면 카드가 잘리거나 빈 공간이 생긴다.

function Avatar({ src, fallbackTone }: { src: string | null | undefined; fallbackTone: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    // 카카오/스토리지 URL이 깨져도 기본 아바타로 — 깨진 이미지 아이콘 방지(기존 처리와 동일)
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white/70"
      />
    );
  }
  return (
    <span
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ring-2 ring-white/70 ${fallbackTone}`}
    >
      <User size={22} />
    </span>
  );
}

const FACE = "flex h-full flex-col justify-between rounded-3xl p-5 shadow-card";
const ACTION =
  "flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/90 text-sm font-bold text-ink-700 shadow-soft transition-all duration-150 ease-snappy hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]";

export function MyPageRoleCard() {
  const { data: session } = useSession();
  const { profile: sitterProfile, isSitter } = useSitterProfileContext();
  const { role, setRole, canSwitch } = useMyPageRole();

  const guardianName = session?.user?.name ?? "회원";
  // 카카오 이름 미동의 계정은 name이 없다 — 매니저 쪽은 닉네임이 더 자기 계정답다
  const managerName = sitterProfile?.nickname ?? session?.user?.name ?? "회원";
  const flipped = role === "manager";

  return (
    <div className="mb-4 sm:mb-5">
      {/* 세그먼트 — 지금 어느 역할인지 + 전환 수단.
          매니저 미등록이면 오른쪽 칸이 전환이 아니라 등록 안내로 간다. */}
      <div
        role="tablist"
        aria-label="마이페이지 역할"
        className="mb-3 flex gap-1 rounded-2xl bg-ink-100/70 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={!flipped}
          onClick={() => setRole("guardian")}
          className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition-all duration-200 ease-snappy active:scale-95 ${
            !flipped ? "bg-white text-royal-700 shadow-card" : "text-ink-500 hover:text-ink-700"
          }`}
        >
          <HeartHandshake size={16} />
          보호자
        </button>

        {canSwitch ? (
          <button
            type="button"
            role="tab"
            aria-selected={flipped}
            onClick={() => setRole("manager")}
            className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition-all duration-200 ease-snappy active:scale-95 ${
              flipped ? "bg-white text-primary-700 shadow-card" : "text-ink-500 hover:text-ink-700"
            }`}
          >
            <Briefcase size={16} />
            매니저
          </button>
        ) : (
          // 미등록자에게도 자리를 남겨둔다 — 칸이 아예 없으면 "매니저로도 활동할 수 있다"는
          // 사실 자체가 안 보인다. 누르면 전환이 아니라 등록 화면으로.
          <Link
            href="/mypage/sitter/register"
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-bold text-ink-400 transition-all duration-200 ease-snappy hover:text-primary-600 active:scale-95"
          >
            <Briefcase size={16} />
            매니저 시작
          </Link>
        )}
      </div>

      {/* 신분증 카드 — 위 세그먼트에 따라 뒤집힌다.
          h-[168px]로 고정하는 이유: 뒷면이 absolute라 높이를 만들지 못한다.
          앞·뒷면 골격이 같아 두 면 모두 이 높이에 딱 맞는다. */}
      <div className="flip-scene">
        <div className={`flip-card h-[168px] ${flipped ? "is-flipped" : ""}`}>
          {/* 앞면 — 보호자 (보라 계열, 기존 보호자 섹션 헤더와 같은 색 문법) */}
          <div
            className={`flip-face ${FACE} h-full bg-gradient-to-br from-royal-600 via-royal-500 to-royal-400`}
            aria-hidden={flipped}
          >
            <div className="flex items-center gap-3">
              <Avatar src={session?.user?.image} fallbackTone="bg-royal-50 text-royal-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-extrabold text-white">{guardianName}님</p>
                <p className="text-[13px] text-white/80">보호자로 이용 중이에요</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/mypage/care-profile" className={ACTION} tabIndex={flipped ? -1 : 0}>
                <HeartHandshake size={16} className="text-royal-500" />
                보호자 프로필
              </Link>
              <Link href="/mypage/edit" className={ACTION} tabIndex={flipped ? -1 : 0}>
                <Settings size={16} className="text-ink-400" />
                정보 수정
              </Link>
            </div>
          </div>

          {/* 뒷면 — 매니저 (코랄 계열, 기존 매니저 대표 카드와 같은 그라데이션) */}
          <div
            className={`flip-face flip-face-back ${FACE} bg-gradient-to-br from-primary-500 to-peach-500`}
            aria-hidden={!flipped}
          >
            <div className="flex items-center gap-3">
              <Avatar
                src={sitterProfile?.photoUrl}
                fallbackTone="bg-primary-50 text-primary-500"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-extrabold text-white">{managerName}님</p>
                <p className="text-[13px] text-white/85">
                  {isSitter ? "돌보다 매니저로 활동 중이에요" : "매니저 등록이 필요해요"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/mypage/sitter/jobs" className={ACTION} tabIndex={flipped ? 0 : -1}>
                <Briefcase size={16} className="text-primary-500" />
                일자리 관리
              </Link>
              <Link href="/mypage/sitter/profile" className={ACTION} tabIndex={flipped ? 0 : -1}>
                <HeartHandshake size={16} className="text-primary-500" />
                프로필 관리
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
