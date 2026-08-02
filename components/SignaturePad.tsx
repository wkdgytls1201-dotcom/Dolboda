"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

// 손글씨 서명 패드 — 마우스와 손가락 모두 받는다.
// 포인터 이벤트 하나로 처리해서 마우스/터치/펜을 따로 다루지 않는다.
export function SignaturePad({
  onChange,
  disabled = false,
}: {
  /** 그릴 때마다 PNG dataURL을 올려준다. 비어 있으면 빈 문자열 */
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  // 캔버스는 CSS 크기와 실제 픽셀 크기가 따로 논다 — devicePixelRatio를 반영하지 않으면
  // 고해상도 화면에서 서명이 뭉개진다(서류에 남는 이미지라 특히 중요).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1B1730";
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    // 캔버스 밖으로 손가락이 나가도 계속 그려지게 포인터를 붙잡는다
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas && hasInk) onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange("");
  }

  return (
    <div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          // touch-action:none — 서명하려고 그은 획이 페이지 스크롤로 새는 걸 막는다
          style={{ touchAction: "none" }}
          className={`h-36 w-full rounded-xl border-2 border-dashed bg-white ${
            disabled ? "cursor-not-allowed border-ink-100 opacity-60" : "cursor-crosshair border-ink-200"
          }`}
        />
        {!hasInk && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-ink-300">
            여기에 서명해주세요
          </span>
        )}
      </div>
      {hasInk && !disabled && (
        <button
          type="button"
          onClick={clear}
          className="mt-2 flex min-h-[44px] items-center gap-1.5 text-[13px] font-semibold text-ink-400 transition-colors hover:text-ink-700"
        >
          <Eraser size={14} />
          다시 그리기
        </button>
      )}
    </div>
  );
}
