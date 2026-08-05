"use client";

// 프로필 사진용 정사각 축소 — 원본을 그대로 올리면 요즘 폰 사진이 3~8MB라
// 업로드도 느리고 목록에서 매번 그 큰 이미지를 받게 된다. 브라우저에서 미리
// 가운데를 정사각으로 잘라 512px WebP(약 30~60KB)로 줄여서 보낸다.
//
// 외부 라이브러리 없이 canvas만 쓴다(번들 0KB 추가).

const SIZE = 512;
const MAX_BYTES = 300 * 1024;

export interface SquareImageResult {
  blob: Blob;
  /** 미리보기용 data URL — 업로드 성공 전에도 바로 보여주기 위한 것 */
  previewUrl: string;
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap이 EXIF 회전을 처리해준다(세로로 찍은 사진이 눕는 문제).
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // 일부 브라우저는 옵션을 모른다 — 옵션 없이 한 번 더
      try {
        return await createImageBitmap(file);
      } catch {
        /* 아래 <img> 경로로 */
      }
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("이미지를 읽지 못했어요."));
      img.src = url;
    });
  } finally {
    // 로드가 끝나면 URL은 더 필요 없다(디코드된 이미지는 남는다)
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * 비율 유지 축소 — 돌봄일지 사진용. 프로필과 달리 자르면 안 되는 사진(식사 상차림,
 * 상처 부위, 산책 풍경)이라 긴 변만 maxEdge로 줄인다. 인코딩·용량 원칙은 위와 동일.
 */
export async function toResizedImage(
  file: File,
  maxEdge = 1280,
  maxBytes = 500 * 1024
): Promise<SquareImageResult> {
  const bitmap = await loadBitmap(file);
  const w = "width" in bitmap ? bitmap.width : 0;
  const h = "height" in bitmap ? bitmap.height : 0;
  if (!w || !h) throw new Error("이미지를 읽지 못했어요.");

  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지를 처리하지 못했어요.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  if ("close" in bitmap) bitmap.close();

  let type = "image/webp";
  let blob = await encode(canvas, type, 0.78);
  if (!blob || blob.type !== type) {
    type = "image/jpeg";
    blob = await encode(canvas, type, 0.8);
  }
  if (blob && blob.size > maxBytes) {
    blob = (await encode(canvas, type, 0.62)) ?? blob;
  }
  if (!blob) throw new Error("이미지를 변환하지 못했어요.");
  if (blob.size > maxBytes) throw new Error("사진 용량이 너무 커요. 다른 사진을 골라주세요.");

  return { blob, previewUrl: canvas.toDataURL(type, 0.6) };
}

export async function toSquareImage(file: File): Promise<SquareImageResult> {
  const bitmap = await loadBitmap(file);
  const w = "width" in bitmap ? bitmap.width : 0;
  const h = "height" in bitmap ? bitmap.height : 0;
  if (!w || !h) throw new Error("이미지를 읽지 못했어요.");

  // 가운데를 정사각으로 자른다 — 얼굴 사진은 대개 가운데에 있다
  const side = Math.min(w, h);
  const sx = (w - side) / 2;
  const sy = (h - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지를 처리하지 못했어요.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap as CanvasImageSource, sx, sy, side, side, 0, 0, SIZE, SIZE);
  if ("close" in bitmap) bitmap.close();

  // WebP를 먼저 시도하고, 지원하지 않는 브라우저면 JPEG으로 떨어진다.
  let type = "image/webp";
  let blob = await encode(canvas, type, 0.82);
  if (!blob || blob.type !== type) {
    type = "image/jpeg";
    blob = await encode(canvas, type, 0.85);
  }
  // 그래도 크면 품질을 낮춰 한 번 더 (사람 얼굴 한 장이 300KB를 넘을 일은 드물다)
  if (blob && blob.size > MAX_BYTES) {
    blob = (await encode(canvas, type, 0.7)) ?? blob;
  }
  if (!blob) throw new Error("이미지를 변환하지 못했어요.");
  if (blob.size > MAX_BYTES) throw new Error("사진 용량이 너무 커요. 다른 사진을 골라주세요.");

  return { blob, previewUrl: canvas.toDataURL(type, 0.7) };
}
