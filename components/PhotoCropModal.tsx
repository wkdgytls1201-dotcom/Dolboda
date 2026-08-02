"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn } from "lucide-react";

// 프로필 사진 크롭 — 원형으로 보이는 자리에 얼굴을 직접 맞춰 넣는다.
//
// 예전엔 고른 사진의 가운데를 기계적으로 잘랐다. 그런데 사람들이 올리는 사진은 대개
// 얼굴이 가운데가 아니라 위쪽이나 한쪽에 있어서, 이마가 잘리거나 배경만 남곤 했다.
//
// 규칙 두 가지를 지킨다:
//  - 모달은 createPortal(document.body) — 조상의 backdrop-blur가 fixed의 기준을
//    바꿔버려 화면 밖으로 밀리는 문제가 있었다(§모달·바텀시트 규칙).
//  - 드래그는 포인터 이벤트 하나로 — 마우스·터치·펜을 따로 다루지 않는다(SignaturePad와 동일).

const VIEW = 280; // 화면에서 자르는 창의 한 변(px)
const OUT = 512; // 저장되는 사진의 한 변(px)
const MAX_BYTES = 300 * 1024;

type Source = ImageBitmap | HTMLImageElement;

async function decode(file: File): Promise<Source> {
  if (typeof createImageBitmap === "function") {
    try {
      // EXIF 회전을 반영해야 세로로 찍은 사진이 눕지 않는다
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

function encode(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export function PhotoCropModal({
  file,
  onCancel,
  onDone,
}: {
  file: File;
  onCancel: () => void;
  onDone: (blob: Blob, previewUrl: string) => void;
}) {
  const [source, setSource] = useState<Source | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    decode(file)
      .then((src) => {
        if (cancelled) return;
        const w = "width" in src ? src.width : 0;
        const h = "height" in src ? src.height : 0;
        if (!w || !h) throw new Error("이미지를 읽지 못했어요.");
        setSource(src);
        setSize({ w, h });
      })
      .catch(() =>
        setError(
          "이 사진은 브라우저에서 열 수 없어요. 아이폰에서 찍은 사진(HEIC)이면 '가장 호환성 높게' 설정으로 저장한 뒤 다시 올려주세요."
        )
      );
    return () => {
      cancelled = true;
    };
  }, [file]);

  // 창을 가득 채우는 최소 배율 — 여기에 zoom을 곱해 실제 표시 배율이 된다
  const base = size.w && size.h ? VIEW / Math.min(size.w, size.h) : 1;
  const scale = base * zoom;
  const dispW = size.w * scale;
  const dispH = size.h * scale;
  // 빈 곳이 생기지 않도록 이동 범위를 제한한다
  const limitX = Math.max(0, (dispW - VIEW) / 2);
  const limitY = Math.max(0, (dispH - VIEW) / 2);
  const clamp = (o: { x: number; y: number }) => ({
    x: Math.max(-limitX, Math.min(limitX, o.x)),
    y: Math.max(-limitY, Math.min(limitY, o.y)),
  });

  useEffect(() => setOffset((o) => clamp(o)));

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    setOffset(clamp({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }));
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  async function apply() {
    if (!source) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUT;
      canvas.height = OUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("이미지를 처리하지 못했어요.");
      ctx.imageSmoothingQuality = "high";
      // 화면에서 보이던 영역을 원본 좌표로 되돌린다
      const viewInSource = VIEW / scale;
      const sx = (size.w - viewInSource) / 2 - offset.x / scale;
      const sy = (size.h - viewInSource) / 2 - offset.y / scale;
      ctx.drawImage(source as CanvasImageSource, sx, sy, viewInSource, viewInSource, 0, 0, OUT, OUT);

      let type = "image/webp";
      let blob = await encode(canvas, type, 0.82);
      if (!blob || blob.type !== type) {
        type = "image/jpeg";
        blob = await encode(canvas, type, 0.85);
      }
      if (blob && blob.size > MAX_BYTES) blob = (await encode(canvas, type, 0.7)) ?? blob;
      if (!blob) throw new Error("이미지를 변환하지 못했어요.");
      onDone(blob, canvas.toDataURL(type, 0.7));
    } catch (e) {
      setError(e instanceof Error ? e.message : "이미지를 처리하지 못했어요.");
      setBusy(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="animate-overlay-in fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="animate-modal-in w-full max-w-sm rounded-t-3xl bg-white p-5 sm:rounded-3xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink-900">사진 위치 맞추기</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="닫기"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-[13px] leading-relaxed text-ink-500">
          원 안에 얼굴이 오도록 끌어서 맞춰주세요. 원 밖은 잘려요.
        </p>

        {error ? (
          <p className="rounded-xl bg-primary-50 px-4 py-3 text-[13px] leading-relaxed text-primary-700">
            {error}
          </p>
        ) : (
          <>
            <div
              className="relative mx-auto touch-none overflow-hidden rounded-2xl bg-ink-100"
              style={{ width: VIEW, height: VIEW }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {source && (
                <img
                  src={URL.createObjectURL(file)}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                  style={{
                    width: dispW,
                    height: dispH,
                    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                  }}
                />
              )}
              {/* 원형 가이드 — 저장되면 어차피 원으로 보이니, 잘릴 범위를 미리 보여준다.
                  바깥을 어둡게 덮는 건 box-shadow 한 방으로(오버레이 div를 쌓지 않는다) */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full border-2 border-dashed border-white/90"
                style={{ boxShadow: "0 0 0 9999px rgba(27,23,48,0.45)" }}
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <ZoomIn size={16} className="shrink-0 text-ink-400" aria-hidden />
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                aria-label="확대"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="h-11 w-full accent-primary-500"
              />
            </div>

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="min-h-[48px] flex-1 rounded-xl border border-ink-100 text-sm font-semibold text-ink-500 transition-colors hover:bg-ink-100"
              >
                취소
              </button>
              <button
                type="button"
                onClick={apply}
                disabled={!source || busy}
                className="min-h-[48px] flex-1 rounded-xl bg-primary-500 text-sm font-bold text-white shadow-soft transition-all hover:bg-primary-600 disabled:opacity-60"
              >
                {busy ? "저장 중…" : "이 위치로 저장"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
