"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ChevronLeft,
  ChevronDown,
  Check,
  AlertTriangle,
  Camera,
  Undo2,
  Sparkles,
  X,
} from "lucide-react";
import { PageLoader } from "@/components/PageLoader";
import { QUICK_NOTE_KINDS } from "@/lib/careLog";
import { toResizedImage } from "@/lib/squareImage";

interface CareLogRow {
  id: string;
  careDate: string;
  createdAt: string;
  photos: { url: string; takenAt?: string }[] | null;
  meal: string | null;
  mood: string | null;
  dayStatus: string | null;
  sleep: string | null;
  bowel: string | null;
  medication: string | null;
  tasks: string[];
  memo: string | null;
  alertNote: string | null;
  workStart: string | null;
  workEnd: string | null;
  readAt: string | null;
  guardianReaction: string | null;
  correctsId: string | null;
}

// 보호자 원탭 반응 — 읽음 확인의 다음 단계. 매니저가 "읽혔다"를 넘어 "고마워한다"를
// 보는 것이 감정노동의 보상이 된다(서버 검증 목록은 api/care-log의 REACTIONS와 동일).
const REACTION_META = [
  { key: "thanks", emoji: "🙏", label: "감사해요" },
  { key: "relieved", emoji: "😊", label: "안심돼요" },
  { key: "cheer", emoji: "💪", label: "수고하셨어요" },
] as const;

interface QuickNoteRow {
  id: string;
  kind: string;
  body: string | null;
  careDate: string;
  createdAt: string;
  canceledAt: string | null;
  readAt: string | null;
}

interface ApiResponse {
  viewer: "guardian" | "sitter";
  availableViews: ("guardian" | "sitter")[];
  sitterNickname: string;
  guardianName: string | null;
  /** 돌봄 시작일(ISO) — 14일 스트립이 돌봄 전 날짜를 "빈 날"로 오해하지 않게 쓴다 */
  startDate: string;
  taskChips: string[];
  options: {
    meal: readonly string[];
    mood: readonly string[];
    dayStatus: readonly string[];
    sleep: readonly string[];
    bowel: readonly string[];
    medication: readonly string[];
  };
  logs: CareLogRow[];
  quickNotes: QuickNoteRow[];
  error?: string;
}

function fmtDate(careDate: string) {
  const d = new Date(careDate + "T00:00:00+09:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * 정정 기록은 원본을 고치지 않고 새 행으로 이어 붙는다(append-only, §4-1). 그래서
 * "오늘 기록이 이미 있는가"·"최신 상태가 뭔가"를 볼 때는 정정 체인의 가장 마지막
 * 항목을 봐야 한다 — correctsId만 걸러내면(!l.correctsId) 정정 이전의 원본만 남아
 * 정정한 내용이 화면에 반영되지 않는다.
 */
function latestOf(logs: CareLogRow[], careDate: string): CareLogRow | undefined {
  const sameDay = logs.filter((l) => l.careDate === careDate);
  if (sameDay.length === 0) return undefined;
  return sameDay.reduce((latest, l) =>
    new Date(l.createdAt) > new Date(latest.createdAt) ? l : latest
  );
}

/** careDate별로 묶어 최신순 정렬 — 각 그룹 안에서는 작성 순서대로(원본 → 정정) 둔다 */
function groupByDate(logs: CareLogRow[]): { careDate: string; entries: CareLogRow[] }[] {
  const byDate = new Map<string, CareLogRow[]>();
  for (const l of logs) {
    const list = byDate.get(l.careDate) ?? [];
    list.push(l);
    byDate.set(l.careDate, list);
  }
  return Array.from(byDate.entries())
    .map(([careDate, entries]) => ({
      careDate,
      entries: entries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    }))
    .sort((a, b) => (a.careDate < b.careDate ? 1 : -1));
}

export default function CareLogPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CareLogPageInner />
    </Suspense>
  );
}

function CareLogPageInner() {
  const { status } = useSession();
  const [data, setData] = useState<ApiResponse | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const asParam = searchParams.get("as");

  function load() {
    const qs = asParam ? `?as=${asParam}` : "";
    fetch(`/api/care-log${qs}`)
      .then((r) => r.json())
      .then((d) => setData(d.error ? null : d))
      .catch(() => setData(null));
  }

  useEffect(() => {
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, asParam]);

  if (status === "loading") return <PageLoader />;

  if (status === "unauthenticated") {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">로그인이 필요해요</h1>
      </main>
    );
  }

  if (data === undefined) return <PageLoader />;

  if (!data) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">확정된 돌봄이 없어요</h1>
        <p className="text-sm text-ink-500">매칭이 확정되면 돌봄일지를 쓸 수 있어요.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 pb-24 pt-6">
      <Link
        href="/care-request"
        className="-ml-2 mb-3 inline-flex min-h-[44px] items-center gap-0.5 px-2 text-sm font-semibold text-ink-500 hover:text-ink-900"
      >
        <ChevronLeft size={18} />
        돌봄 요청
      </Link>
      <h1 className="mb-1 text-xl font-bold text-ink-900">돌봄일지</h1>
      <p className="mb-5 text-sm leading-relaxed text-ink-500">
        이 일지는 두 분이 서로 확인하시는 기록이에요. 사례비 정산과는 별개예요.
      </p>

      {/* 한 계정이 보호자·매니저 둘 다인 경우에만 뜬다(역할 전환 계정, 운영자 테스트 계정). */}
      {data.availableViews.length > 1 && (
        <div className="mb-4 inline-flex rounded-full bg-ink-100/60 p-1">
          {(["sitter", "guardian"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => router.replace(`${pathname}?as=${v}`)}
              className={`min-h-[36px] rounded-full px-4 text-[13px] font-bold transition-colors ${
                data.viewer === v ? "bg-white text-primary-600 shadow-soft" : "text-ink-400"
              }`}
            >
              {v === "sitter" ? "매니저로 보기" : "보호자로 보기"}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mb-3 rounded-xl bg-primary-50 px-3.5 py-2.5 text-xs font-semibold text-primary-700">
          {error}
        </p>
      )}

      {data.viewer === "sitter" ? (
        <SitterView data={data} onSaved={load} onError={setError} />
      ) : (
        <GuardianView data={data} />
      )}
    </main>
  );
}

// ────────────────────────────── 매니저 — 작성 ──────────────────────────────

function SitterView({
  data,
  onSaved,
  onError,
}: {
  data: ApiResponse;
  onSaved: () => void;
  onError: (e: string | null) => void;
}) {
  const todayKst = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const todayLog = latestOf(data.logs, todayKst);
  const pastDates = Array.from(new Set(data.logs.map((l) => l.careDate)))
    .filter((d) => d < todayKst)
    .sort()
    .reverse();
  const yesterdayLog = pastDates[0] ? latestOf(data.logs, pastDates[0]) : undefined;

  const [sending, setSending] = useState<string | null>(null);
  const [meal, setMeal] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [dayStatus, setDayStatus] = useState<string | null>(null);
  const [alertNote, setAlertNote] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [sleep, setSleep] = useState<string | null>(null);
  const [bowel, setBowel] = useState<string | null>(null);
  const [medication, setMedication] = useState<string | null>(null);
  const [tasks, setTasks] = useState<string[]>([]);
  const [memo, setMemo] = useState("");
  // 오늘 사진 — 업로드가 끝난 URL만 담는다(§9-2, 최대 3장)
  const [photos, setPhotos] = useState<{ url: string; takenAt: string }[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [correcting, setCorrecting] = useState(false);

  async function addPhoto(file: File) {
    onError(null);
    if (photos.length >= 3) return;
    setPhotoBusy(true);
    try {
      const { blob } = await toResizedImage(file);
      const res = await fetch("/api/care-log/photo", {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });
      const d = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !d?.url) throw new Error(d?.error ?? "사진을 올리지 못했어요.");
      setPhotos((prev) => [...prev, { url: d.url!, takenAt: new Date().toISOString() }]);
    } catch (e) {
      onError(e instanceof Error ? e.message : "사진을 올리지 못했어요.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function sendQuickNote(kind: string, body?: string) {
    onError(null);
    setSending(kind);
    try {
      const res = await fetch("/api/care-log/quick-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, body }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "보내지 못했어요.");
    } finally {
      setSending(null);
    }
  }

  async function cancelQuickNote(id: string) {
    try {
      await fetch("/api/care-log/quick-note", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      onSaved();
    } catch {
      /* 조용히 무시 — 사용자는 다시 시도하면 된다 */
    }
  }

  function fillFromYesterday() {
    if (!yesterdayLog) return;
    setMeal(yesterdayLog.meal);
    setMood(yesterdayLog.mood);
    setDayStatus("별일 없었어요");
    setSleep(yesterdayLog.sleep);
    setBowel(yesterdayLog.bowel);
    setMedication(yesterdayLog.medication);
    setTasks(yesterdayLog.tasks);
  }

  async function save() {
    onError(null);
    if (dayStatus === "알려드릴 일이 있어요" && !alertNote.trim()) {
      onError("무슨 일인지 짧게 적어주세요.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/care-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal,
          mood,
          dayStatus,
          alertNote: alertNote.trim() || undefined,
          sleep,
          bowel,
          medication,
          tasks,
          memo: memo.trim() || undefined,
          photos: photos.length > 0 ? photos : undefined,
          correctsId: correcting ? todayLog?.id : undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      onSaved();
      setCorrecting(false);
      setPhotos([]);
    } catch (e) {
      onError(e instanceof Error ? e.message : "저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  const recentNotes = data.quickNotes.filter((n) => !n.canceledAt).slice(0, 6);

  return (
    <div className="space-y-5">
      {/* 빠른 알림 — 하루 정리보다 위. 대부분의 방문은 "지금 알리려고" 온다(§7-1) */}
      <section className="rounded-2xl bg-white p-4 shadow-card">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink-900">
          <Sparkles size={15} className="text-primary-500" />
          지금 알려드리기
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_NOTE_KINDS.map((q) => (
            <button
              key={q.kind}
              type="button"
              disabled={sending !== null}
              onClick={() => sendQuickNote(q.kind)}
              className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-ivory-100 px-3.5 text-[13px] font-bold text-ink-700 transition-all duration-150 ease-snappy hover:bg-ink-100 active:scale-90 disabled:opacity-50"
            >
              <span>{q.emoji}</span>
              {sending === q.kind ? "보내는 중…" : q.label}
            </button>
          ))}
          <QuickAlertButton onSend={(body) => sendQuickNote("custom", body)} busy={sending !== null} />
        </div>

        {recentNotes.length > 0 && (
          <ul className="mt-3 space-y-1.5 border-t border-ink-100 pt-3">
            {recentNotes.map((n) => {
              const meta = QUICK_NOTE_KINDS.find((k) => k.kind === n.kind);
              const canCancel = Date.now() - new Date(n.createdAt).getTime() < 60_000;
              return (
                <li key={n.id} className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="text-ink-500">
                    {fmtTime(n.createdAt)} · {meta ? `${meta.emoji} ${meta.label}` : `⚠️ ${n.body}`}
                  </span>
                  {canCancel && (
                    <button
                      type="button"
                      onClick={() => cancelQuickNote(n.id)}
                      className="flex items-center gap-0.5 font-semibold text-ink-400 hover:text-primary-600"
                    >
                      <Undo2 size={11} />
                      잘못 눌렀어요
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 오늘 하루 정리 */}
      <section className="rounded-2xl bg-white p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-ink-900">오늘 하루 정리</p>
          {todayLog && !correcting && (
            <span className="animate-pop flex items-center gap-1 rounded-full bg-mint-100 px-2.5 py-1 text-[11px] font-bold text-mint-700">
              <Check size={11} />
              작성 완료
            </span>
          )}
        </div>

        {todayLog && !correcting ? (
          <div className="space-y-2 rounded-xl bg-ivory-100/60 p-3.5 text-[13px] text-ink-700">
            {todayLog.meal && <p>🍚 식사: {todayLog.meal}</p>}
            {todayLog.mood && <p>😊 컨디션: {todayLog.mood}</p>}
            {todayLog.dayStatus && <p>오늘 하루: {todayLog.dayStatus}</p>}
            {(todayLog.photos?.length ?? 0) > 0 && (
              <div className="flex gap-1.5">
                {todayLog.photos!.map((p, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={p.url}
                    alt={`오늘 사진 ${i + 1}`}
                    loading="lazy"
                    className="h-14 w-14 rounded-lg bg-ink-100 object-cover"
                  />
                ))}
              </div>
            )}
            {todayLog.alertNote && (
              <p className="font-semibold text-primary-600">⚠️ {todayLog.alertNote}</p>
            )}
            {todayLog.readAt && !todayLog.guardianReaction && (
              <p className="text-[11px] text-mint-600">보호자님이 확인했어요</p>
            )}
            {todayLog.guardianReaction &&
              (() => {
                const r = REACTION_META.find((x) => x.key === todayLog.guardianReaction);
                return r ? (
                  <p className="text-[11px] font-semibold text-primary-600">
                    보호자님이 {r.emoji} “{r.label}” 반응을 남겼어요
                  </p>
                ) : null;
              })()}
            <button
              type="button"
              onClick={() => {
                // 빈 폼이 아니라 지금 값에서 시작해야 고칠 부분만 바꾸면 된다
                setMeal(todayLog.meal);
                setMood(todayLog.mood);
                setDayStatus(todayLog.dayStatus);
                setAlertNote(todayLog.alertNote ?? "");
                setSleep(todayLog.sleep);
                setBowel(todayLog.bowel);
                setMedication(todayLog.medication);
                setTasks(todayLog.tasks);
                setMemo(todayLog.memo ?? "");
                setPhotos(
                  (todayLog.photos ?? []).map((p) => ({
                    url: p.url,
                    takenAt: p.takenAt ?? new Date().toISOString(),
                  }))
                );
                setExpanded(Boolean(todayLog.sleep || todayLog.bowel || todayLog.medication || todayLog.tasks.length));
                setCorrecting(true);
              }}
              className="mt-1 text-[12px] font-semibold text-ink-400 underline underline-offset-2 hover:text-ink-700"
            >
              정정 기록 남기기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <OptionRow label="식사는 어떠셨어요?" options={data.options.meal} value={meal} onChange={setMeal} />
            <OptionRow label="컨디션은요?" options={data.options.mood} value={mood} onChange={setMood} />
            <OptionRow
              label="오늘 하루는?"
              options={data.options.dayStatus}
              value={dayStatus}
              onChange={setDayStatus}
              tone={(o) => (o === "알려드릴 일이 있어요" ? "alert" : "normal")}
            />
            {dayStatus === "알려드릴 일이 있어요" && (
              <textarea
                value={alertNote}
                onChange={(e) => setAlertNote(e.target.value.slice(0, 300))}
                rows={2}
                placeholder="무슨 일인지 짧게 적어주세요. 저장하면 보호자님께 바로 알려드려요."
                className="w-full resize-none rounded-xl border border-primary-200 bg-primary-50 px-3.5 py-2.5 text-sm outline-none focus:border-primary-400"
              />
            )}

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-[12px] font-semibold text-ink-400 hover:text-ink-700"
            >
              ＋ 더 자세히 남기기 (선택)
              <ChevronDown
                size={13}
                className={`transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </button>

            {expanded && (
              <div className="space-y-4 rounded-xl bg-ivory-100/50 p-3.5">
                <OptionRow label="수면" options={data.options.sleep} value={sleep} onChange={setSleep} small />
                <OptionRow label="배변" options={data.options.bowel} value={bowel} onChange={setBowel} small />
                <OptionRow
                  label="복약"
                  options={data.options.medication}
                  value={medication}
                  onChange={setMedication}
                  small
                />
                {data.taskChips.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[12px] font-semibold text-ink-500">오늘 한 일</p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.taskChips.map((t) => {
                        const active = tasks.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() =>
                              setTasks((prev) =>
                                active ? prev.filter((x) => x !== t) : [...prev, t]
                              )
                            }
                            className={`min-h-[36px] rounded-full px-3 text-[12px] font-bold transition-colors ${
                              active ? "bg-primary-500 text-white" : "bg-white text-ink-500"
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value.slice(0, 300))}
                rows={2}
                placeholder="가족분께 전하고 싶은 말이 있다면 (선택)"
                className="w-full resize-none rounded-xl border border-ink-100 px-3.5 py-2.5 text-sm outline-none focus:border-primary-400"
              />
            </div>

            {/* 오늘 사진(§9-2) — 카메라 촬영 유도(capture). 업계 관행(카톡·밴드 공유)의
                핵심이 사진인데, 여기 남기면 흩어지지 않고 그날 일지에 붙는다. */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {photos.map((p, i) => (
                  <span key={p.url} className="relative h-16 w-16 overflow-hidden rounded-xl bg-ink-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={`올린 사진 ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      aria-label="사진 빼기"
                      onClick={() => setPhotos((prev) => prev.filter((x) => x.url !== p.url))}
                      className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink-900/60 text-white"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {photos.length < 3 && (
                  <label
                    className={`flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-ink-100 text-ink-400 transition-colors hover:border-primary-300 hover:text-primary-500 ${
                      photoBusy ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    <Camera size={18} aria-hidden />
                    <span className="text-[10px] font-semibold">{photoBusy ? "올리는 중" : "사진"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = ""; // 같은 파일을 다시 골라도 change가 다시 온다
                        if (f) addPhoto(f);
                      }}
                    />
                  </label>
                )}
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink-300">
                사진은 이 돌봄의 보호자에게만 보여요. 촬영 전 어르신과 보호자께 동의를
                받아주세요. (최대 3장)
              </p>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="flex min-h-[50px] w-full items-center justify-center rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-colors hover:bg-primary-600 disabled:opacity-60"
            >
              {saving ? "저장 중…" : "오늘 기록 남기기"}
            </button>
            {yesterdayLog && !correcting && (
              <button
                type="button"
                onClick={fillFromYesterday}
                className="mx-auto flex items-center gap-1 text-[12px] font-semibold text-ink-400 hover:text-ink-700"
              >
                <Undo2 size={11} />
                어제와 같아요
              </button>
            )}
            {correcting && (
              <button
                type="button"
                onClick={() => setCorrecting(false)}
                className="mx-auto block text-[12px] font-semibold text-ink-400 underline underline-offset-2"
              >
                취소
              </button>
            )}
          </div>
        )}

        {/* 동기부여 — 지어낸 수치("95%") 대신 실제로 참인 사실을 강하게 말한다:
            일지 기록일 수는 지원자 카드·공개 프로필에 실적으로 표시된다(2026-08-05). */}
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-mint-50/70 p-3.5">
          <Sparkles size={15} className="mt-0.5 shrink-0 text-mint-600" aria-hidden />
          <p className="text-[12px] leading-relaxed text-ink-700">
            <span className="font-bold text-mint-700">오늘 남긴 일지는 그대로 실적이 돼요.</span>
            <br />
            보호자는 지원자를 고를 때 완료 건수·평점과 함께{" "}
            <span className="font-bold">돌봄일지 기록일 수</span>를 봐요. 꾸준한 기록이
            다음 매칭에서 선택받을 확률을 크게 높여요.
          </p>
        </div>
      </section>

      <PastLogs logs={data.logs.filter((l) => l.careDate !== todayKst)} />
    </div>
  );
}

function QuickAlertButton({ onSend, busy }: { onSend: (body: string) => void; busy: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-primary-50 px-3.5 text-[13px] font-bold text-primary-700 transition-all duration-150 ease-snappy hover:bg-primary-100 active:scale-90 disabled:opacity-50"
      >
        <AlertTriangle size={13} />
        알려드릴 일
      </button>
    );
  }

  return (
    <div className="flex w-full items-center gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 300))}
        placeholder="무슨 일인지 짧게 적어주세요"
        autoFocus
        className="min-w-0 flex-1 rounded-xl border border-primary-200 px-3 py-2 text-sm outline-none focus:border-primary-400"
      />
      <button
        type="button"
        disabled={!text.trim() || busy}
        onClick={() => {
          onSend(text.trim());
          setText("");
          setOpen(false);
        }}
        className="shrink-0 rounded-xl bg-primary-500 px-3.5 py-2 text-sm font-bold text-white transition-transform duration-150 ease-snappy active:scale-90 disabled:opacity-50"
      >
        전송
      </button>
    </div>
  );
}

function OptionRow({
  label,
  options,
  value,
  onChange,
  tone,
  small,
}: {
  label: string;
  options: readonly string[];
  value: string | null;
  onChange: (v: string) => void;
  tone?: (o: string) => "normal" | "alert";
  small?: boolean;
}) {
  return (
    <div>
      <p className={`mb-1.5 font-semibold text-ink-500 ${small ? "text-[12px]" : "text-[13px]"}`}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = value === o;
          const isAlert = tone?.(o) === "alert";
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              className={`flex items-center justify-center rounded-xl font-bold transition-all duration-150 ease-snappy active:scale-90 ${
                small ? "min-h-[40px] px-3 text-[12px]" : "min-h-[48px] flex-1 px-3 text-[13px]"
              } ${
                active
                  ? "bg-primary-500 text-white"
                  : isAlert
                  ? "bg-primary-50 text-primary-600"
                  : "bg-ivory-100 text-ink-500"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PastLogs({ logs }: { logs: CareLogRow[] }) {
  if (logs.length === 0) return null;
  const groups = groupByDate(logs).slice(0, 14);
  return (
    <section>
      <p className="mb-2 px-1 text-[13px] font-semibold text-ink-300">지난 기록</p>
      <ul className="space-y-2">
        {groups.map(({ careDate, entries }, i) => {
          // 화면에는 최신 버전만 보여준다 — 정정했다는 사실은 배지로 알리고,
          // 원본까지 나란히 펼치는 건 분쟁이 생겼을 때 필요한 상세 보기(추후)로 남겨둔다.
          const current = entries[entries.length - 1];
          return (
            <li
              key={careDate}
              className="animate-fade-up rounded-2xl bg-white p-3.5 text-[12px] shadow-card"
              style={{ animationDelay: `${(i % 6) * 50}ms` }}
            >
              <p className="mb-1 flex items-center gap-1.5 font-bold text-ink-900">
                {fmtDate(careDate)}
                {entries.length > 1 && (
                  <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-400">
                    정정됨
                  </span>
                )}
                {/* 받았던 반응은 지난 기록에도 남는다 — 오늘 카드에서 사라지면 끝이던
                    고마움이 쌓여 보이는 것이 인정의 축적이다(2026-08-05). */}
                {current.guardianReaction &&
                  (() => {
                    const r = REACTION_META.find((x) => x.key === current.guardianReaction);
                    return r ? (
                      <span
                        title={`보호자 반응: ${r.label}`}
                        className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-bold text-primary-600"
                      >
                        {r.emoji} {r.label}
                      </span>
                    ) : null;
                  })()}
              </p>
              <p className="text-ink-500">
                {[current.meal, current.mood].filter(Boolean).join(" · ") || "기록 없음"}
              </p>
              {current.alertNote && (
                <p className="mt-1 font-semibold text-primary-600">⚠️ {current.alertNote}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ────────────────────────────── 보호자 — 열람 ──────────────────────────────

function GuardianView({ data }: { data: ApiResponse }) {
  // 반응은 화면부터 바꾸고 서버는 뒤따른다(낙관적) — 실패하면 되돌린다.
  const [reactions, setReactions] = useState<Record<string, string | null>>({});
  const [reactingId, setReactingId] = useState<string | null>(null);

  async function react(logId: string, current: string | null, next: string) {
    const value = current === next ? null : next; // 같은 걸 또 누르면 취소
    setReactingId(logId);
    setReactions((prev) => ({ ...prev, [logId]: value }));
    try {
      const res = await fetch("/api/care-log", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId, reaction: value }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setReactions((prev) => ({ ...prev, [logId]: current }));
    } finally {
      setReactingId(null);
    }
  }

  // 하루에 정정까지 여러 행이 쌓일 수 있으니, 날짜별로 묶어 최신 버전 하나씩만 센다
  // (그렇지 않으면 정정한 날이 두 번 잡혀 "식사 잘하신 날" 숫자가 부풀려진다).
  const dayGroups = groupByDate(data.logs);
  const currentPerDay = dayGroups.map((g) => g.entries[g.entries.length - 1]);
  const mealDays = currentPerDay.filter((l) => l.meal === "잘 드심").length;
  const alertDays = currentPerDay.filter((l) => l.alertNote).length;
  const recentNotes = data.quickNotes.filter((n) => !n.canceledAt).slice(0, 8);

  // 최근 14일 스트립(§4-5 "빈 날은 빈 날로 보여준다") — 기록 목록만으로는 공백이 안
  // 보인다. 돌봄 시작 전 날짜는 빈 날이 아니라 "기간 밖"이라 스트립에서 제외한다.
  const byDate = new Map(dayGroups.map((g) => [g.careDate, g.entries[g.entries.length - 1]]));
  const startYmd = data.startDate.slice(0, 10);
  const strip: { ymd: string; day: number; state: "alert" | "logged" | "empty" }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    if (ymd < startYmd) continue;
    const entry = byDate.get(ymd);
    strip.push({
      ymd,
      day: d.getDate(),
      state: entry ? (entry.alertNote ? "alert" : "logged") : "empty",
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-royal-50 p-4">
        <p className="mb-1 text-sm font-bold text-ink-900">{data.sitterNickname}님이 남긴 기록</p>
        <p className="text-[12px] text-ink-500">
          전체 {dayGroups.length}일 · 식사 잘하신 날 {mealDays}일
          {alertDays > 0 && ` · 특이사항 ${alertDays}건`}
        </p>
        {strip.length > 1 && (
          <ul className="mt-3 flex gap-1" aria-label="최근 14일 기록 현황">
            {strip.map((s) => (
              <li
                key={s.ymd}
                title={`${s.ymd} — ${
                  s.state === "alert" ? "특이사항 기록" : s.state === "logged" ? "기록 있음" : "기록 없음"
                }`}
                className="flex min-w-0 flex-1 flex-col items-center gap-1"
              >
                <span
                  aria-hidden
                  className={`h-2.5 w-2.5 rounded-full ${
                    s.state === "alert"
                      ? "bg-primary-500"
                      : s.state === "logged"
                        ? "bg-royal-400"
                        : "border border-ink-200 bg-transparent"
                  }`}
                />
                <span className="text-[9px] leading-none text-ink-300">{s.day}</span>
                <span className="sr-only">
                  {s.ymd} {s.state === "alert" ? "특이사항 기록" : s.state === "logged" ? "기록 있음" : "기록 없음"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {recentNotes.length > 0 && (
        <section>
          <p className="mb-2 px-1 text-[13px] font-semibold text-ink-300">오늘의 소식</p>
          <ul className="space-y-1.5 rounded-2xl bg-white p-3.5 shadow-card">
            {recentNotes.map((n) => {
              const meta = QUICK_NOTE_KINDS.find((k) => k.kind === n.kind);
              return (
                <li key={n.id} className="flex items-center gap-2 text-[13px]">
                  <span className="shrink-0 text-ink-300">{fmtTime(n.createdAt)}</span>
                  <span className={n.kind === "custom" ? "font-semibold text-primary-600" : "text-ink-700"}>
                    {meta ? `${meta.emoji} ${meta.message}` : `⚠️ ${n.body}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {data.logs.length === 0 ? (
        <p className="rounded-2xl bg-white p-5 text-center text-sm leading-relaxed text-ink-400 shadow-card">
          아직 기록이 없어요. 돌봄일지는 매니저님이 자율적으로 남기는 기록이라
          <br />
          없는 날도 있을 수 있어요.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {dayGroups.map(({ careDate, entries }, i) => {
            const l = entries[entries.length - 1]; // 정정이 있으면 최신 버전을 보여준다
            return (
              <li
                key={careDate}
                className="animate-fade-up rounded-2xl bg-white p-4 shadow-card"
                style={{ animationDelay: `${(i % 6) * 50}ms` }}
              >
                <p className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
                    {fmtDate(careDate)}
                    {entries.length > 1 && (
                      <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-400">
                        정정됨
                      </span>
                    )}
                  </span>
                  {l.alertNote && (
                    <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-600">
                      알림
                    </span>
                  )}
                </p>
                <dl className="space-y-1 text-[13px] text-ink-700">
                  {l.meal && <p>🍚 식사: {l.meal}</p>}
                  {l.mood && <p>😊 컨디션: {l.mood}</p>}
                  {l.sleep && <p>😴 수면: {l.sleep}</p>}
                  {/* 복약·배변은 보호자가 가장 궁금해하는 항목인데 빠져 있었다(2026-08-05) */}
                  {l.medication && <p>💊 복약: {l.medication}</p>}
                  {l.bowel && <p>🚻 배변: {l.bowel}</p>}
                  {l.tasks.length > 0 && <p>오늘 한 일: {l.tasks.join(", ")}</p>}
                  {l.memo && <p className="italic text-ink-500">“{l.memo}”</p>}
                  {l.alertNote && (
                    <p className="font-semibold text-primary-600">⚠️ {l.alertNote}</p>
                  )}
                </dl>

                {/* 사진(§9-2) — 탭하면 원본을 새 탭으로(라이트박스 없는 0-JS 확대) */}
                {(l.photos?.length ?? 0) > 0 && (
                  <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                    {l.photos!.map((p, i) => (
                      <a
                        key={i}
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-square overflow-hidden rounded-xl bg-ink-100"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.url}
                          alt={`돌봄 사진 ${i + 1}`}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-200 active:scale-95"
                        />
                      </a>
                    ))}
                  </div>
                )}

                {/* 원탭 반응 — 확인만 하고 끝나던 일지에 "마음을 돌려주는" 한 번의 탭.
                    같은 버튼을 다시 누르면 취소된다. */}
                {(() => {
                  const current =
                    reactions[l.id] !== undefined ? reactions[l.id] : l.guardianReaction;
                  return (
                    <div className="mt-3 flex gap-1.5 border-t border-ink-100 pt-2.5">
                      {REACTION_META.map((r) => (
                        <button
                          key={r.key}
                          type="button"
                          aria-pressed={current === r.key}
                          disabled={reactingId === l.id}
                          onClick={() => react(l.id, current ?? null, r.key)}
                          className={`min-h-[44px] flex-1 rounded-xl text-[12px] font-semibold transition-all duration-150 active:scale-95 disabled:opacity-60 ${
                            current === r.key
                              ? "bg-primary-50 text-primary-700 ring-1 ring-primary-200"
                              : "bg-ink-100/50 text-ink-500 hover:bg-ink-100"
                          }`}
                        >
                          {r.emoji} {r.label}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
