import type { SitterProfileData } from "./sitterProfileContext";

// 매니저 프로필 완성도 — 보호자가 지원자를 고를 때 실제로 보는 항목 기준.
// 완성도가 높을수록 매칭 확률이 올라간다는 걸 수치로 보여줘 프로필을 채우게 유도한다.
export interface ProgressItem {
  key: string;
  label: string;
  done: boolean;
  /** 완성 안 됐을 때 안내 문구 */
  hint: string;
  /** 바로가기 */
  href: string;
}

export function sitterProgress(profile: SitterProfileData): {
  items: ProgressItem[];
  percent: number;
  nextItem: ProgressItem | null;
} {
  const items: ProgressItem[] = [
    {
      key: "photo",
      label: "프로필 사진",
      done: Boolean(profile.photoUrl),
      hint: "사진이 있는 프로필이 훨씬 신뢰를 얻어요",
      href: "/mypage/sitter/profile",
    },
    {
      key: "intro",
      label: "자기소개",
      done: Boolean(profile.intro && profile.intro.trim().length >= 30),
      hint: "30자 이상, 경험과 강점을 적어보세요",
      href: "/mypage/sitter/profile",
    },
    {
      key: "career",
      label: "경력 입력",
      done: profile.experienceYears > 0,
      hint: "경력 연차를 입력하면 상단에 표시돼요",
      href: "/mypage/sitter/profile",
    },
    {
      key: "cert",
      label: "자격증 등록",
      done: profile.certifications.length > 0,
      hint: "요양보호사 자격증이 있다면 꼭 등록하세요",
      href: "/mypage/sitter/profile",
    },
    {
      key: "regions",
      label: "활동 지역",
      done: profile.regions.length > 0,
      hint: "활동 지역을 정하면 맞는 일자리를 보여드려요",
      href: "/mypage/sitter/profile",
    },
    {
      key: "bank",
      label: "정산 계좌",
      done: Boolean(profile.bankAccountNumber),
      hint: "매칭 확정 전에 미리 등록해두면 편해요",
      href: "/mypage/sitter/settlements",
    },
  ];

  const doneCount = items.filter((i) => i.done).length;
  return {
    items,
    percent: Math.round((doneCount / items.length) * 100),
    nextItem: items.find((i) => !i.done) ?? null,
  };
}

// 활동 실적에 따른 호칭 — 완료 경험이 쌓일수록 올라가서 계속 활동할 이유를 만든다
export function sitterLevel(completed: number, matched: number): {
  label: string;
  emoji: string;
  next: string | null;
} {
  if (completed >= 10) return { label: "베테랑 매니저", emoji: "👑", next: null };
  if (completed >= 5)
    return { label: "프로 매니저", emoji: "🌟", next: `돌봄 완료 ${10 - completed}건 더하면 베테랑` };
  if (completed >= 1)
    return { label: "성장 매니저", emoji: "🌿", next: `돌봄 완료 ${5 - completed}건 더하면 프로` };
  if (matched >= 1) return { label: "첫 돌봄 진행 중", emoji: "💪", next: "첫 돌봄을 완료하면 성장 매니저" };
  return { label: "새싹 매니저", emoji: "🌱", next: "첫 매칭이 되면 레벨이 올라가요" };
}
