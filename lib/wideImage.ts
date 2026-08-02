"use client";

// 지역 배너용 와이드 축소 — 프로필 사진(정사각, squareImage.ts)과 크롭 비율만 다르다.
// 배너는 가로가 긴 자리(지역 페이지 상단)라 4:1로 가운데를 자른다.
//
// 외부 라이브러리 없이 canvas만 쓴다(번들 0KB 추가) — squareImage.ts와 같은 접근.

const WIDTH = 1200;
const HEIGHT = 300; // 4:1
const MAX_BYTES = 700 * 1024;

export interface WideImageResult {
  blob: Blob;
  previewUrl: string;
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
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
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function toWideImage(file: File): Promise<WideImageResult> {
  const bitmap = await loadBitmap(file);
  const w = "width" in bitmap ? bitmap.width : 0;
  const h = "height" in bitmap ? bitmap.height : 0;
  if (!w || !h) throw new Error("이미지를 읽지 못했어요.");

  // "cover" 크롭 — 목표 비율(4:1)보다 세로가 길면 위아래를, 가로가 길면 좌우를 자른다
  const targetRatio = WIDTH / HEIGHT;
  const srcRatio = w / h;
  let sx = 0,
    sy = 0,
    sw = w,
    sh = h;
  if (srcRatio > targetRatio) {
    sw = h * targetRatio;
    sx = (w - sw) / 2;
  } else {
    sh = w / targetRatio;
    sy = (h - sh) / 2;
  }

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지를 처리하지 못했어요.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap as CanvasImageSource, sx, sy, sw, sh, 0, 0, WIDTH, HEIGHT);
  if ("close" in bitmap) bitmap.close();

  let type = "image/webp";
  let blob = await encode(canvas, type, 0.85);
  if (!blob || blob.type !== type) {
    type = "image/jpeg";
    blob = await encode(canvas, type, 0.88);
  }
  if (blob && blob.size > MAX_BYTES) {
    blob = (await encode(canvas, type, 0.72)) ?? blob;
  }
  if (!blob) throw new Error("이미지를 변환하지 못했어요.");
  if (blob.size > MAX_BYTES) throw new Error("이미지 용량이 너무 커요. 다른 사진을 골라주세요.");

  return { blob, previewUrl: canvas.toDataURL(type, 0.7) };
}
