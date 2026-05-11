import React, { useRef, useState } from "react";
import AuthImage from "./AuthImage";

/**
 * Drag-to-reveal before/after slider. Both images square-cropped.
 */
export default function BeforeAfterCompare({ beforeId, afterId }) {
  const [pos, setPos] = useState(50);
  const ref = useRef(null);
  const dragging = useRef(false);

  const onMove = (clientX) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, x)));
  };

  return (
    <div
      ref={ref}
      data-testid="before-after-compare"
      className="relative w-full aspect-[4/5] overflow-hidden rounded-md bg-stone-100 select-none"
      onMouseDown={(e) => {
        dragging.current = true;
        onMove(e.clientX);
      }}
      onMouseMove={(e) => dragging.current && onMove(e.clientX)}
      onMouseUp={() => (dragging.current = false)}
      onMouseLeave={() => (dragging.current = false)}
      onTouchStart={(e) => onMove(e.touches[0].clientX)}
      onTouchMove={(e) => onMove(e.touches[0].clientX)}
    >
      {/* After (base) */}
      <div className="absolute inset-0">
        {afterId ? (
          <AuthImage imageId={afterId} alt="After" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-sm">No after image</div>
        )}
      </div>
      {/* Before (clipped) */}
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {beforeId ? (
          <AuthImage imageId={beforeId} alt="Before" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-sm bg-stone-50">No before image</div>
        )}
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-sm bg-black/70 backdrop-blur text-white text-[10px] font-semibold uppercase tracking-[0.14em]">
        Before
      </div>
      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-sm bg-[#E35D3F] text-white text-[10px] font-semibold uppercase tracking-[0.14em]">
        After
      </div>

      {/* Divider */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.1)]"
        style={{ left: `${pos}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-9 w-9 rounded-full bg-white border border-stone-200 shadow-md flex items-center justify-center">
          <div className="flex gap-0.5">
            <div className="w-[2px] h-3 bg-stone-400" />
            <div className="w-[2px] h-3 bg-stone-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
