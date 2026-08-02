// Supabase Storage 최소 클라이언트 — @supabase/supabase-js(수백 KB)를 넣지 않고
// REST 엔드포인트만 fetch로 직접 부른다. 서버 전용(서비스 롤 키를 쓴다).
//
// 필요한 환경변수:
//   SUPABASE_URL               예: https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  Supabase 대시보드 → Settings → API → service_role
// 둘 중 하나라도 없으면 isStorageConfigured()가 false다 — 호출부는 이때
// "아직 준비되지 않았어요"를 사용자에게 알려주고 조용히 실패하지 않는다.

const URL_BASE = process.env.SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isStorageConfigured(): boolean {
  return Boolean(URL_BASE && KEY);
}

function headers(extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${KEY}`, apikey: KEY as string, ...extra };
}

/** 버킷이 없으면 만든다(공개 버킷). 이미 있으면 그대로 둔다. */
async function ensureBucket(bucket: string) {
  const res = await fetch(`${URL_BASE}/storage/v1/bucket`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      id: bucket,
      name: bucket,
      public: true,
      file_size_limit: 1024 * 1024, // 1MB — 프로필 사진은 브라우저에서 이미 줄여서 온다
      allowed_mime_types: ["image/webp", "image/jpeg", "image/png"],
    }),
  });
  // 409(이미 있음)는 정상 흐름이다
  if (!res.ok && res.status !== 409) {
    throw new Error(`버킷 생성 실패(${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
}

/** 파일을 올리고 공개 URL을 돌려준다. 같은 경로면 덮어쓴다(x-upsert). */
export async function uploadPublicObject(
  bucket: string,
  path: string,
  body: ArrayBuffer | Buffer,
  contentType: string
): Promise<string> {
  if (!isStorageConfigured()) throw new Error("스토리지 환경변수가 없습니다.");
  const url = `${URL_BASE}/storage/v1/object/${bucket}/${path}`;
  const put = () =>
    fetch(url, {
      method: "POST",
      headers: headers({ "Content-Type": contentType, "x-upsert": "true" }),
      body: body as BodyInit,
    });

  let res = await put();
  // 버킷이 아직 없는 첫 실행이면 만들고 한 번만 다시 시도한다
  if (res.status === 404) {
    await ensureBucket(bucket);
    res = await put();
  }
  if (!res.ok) {
    throw new Error(`업로드 실패(${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  return `${URL_BASE}/storage/v1/object/public/${bucket}/${path}`;
}

/** 지우기 실패는 치명적이지 않다(고아 파일이 남을 뿐) — 호출부에서 무시해도 된다. */
export async function deletePublicObject(bucket: string, path: string): Promise<void> {
  if (!isStorageConfigured()) return;
  await fetch(`${URL_BASE}/storage/v1/object/${bucket}/${path}`, {
    method: "DELETE",
    headers: headers(),
  }).catch(() => {});
}

/** 공개 URL에서 우리 버킷의 경로만 뽑는다(삭제할 때 필요). 우리 것이 아니면 null. */
export function pathFromPublicUrl(bucket: string, url: string | null | undefined): string | null {
  if (!url || !URL_BASE) return null;
  const prefix = `${URL_BASE}/storage/v1/object/public/${bucket}/`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}
