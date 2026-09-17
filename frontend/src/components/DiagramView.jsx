import { useEffect, useRef, useState } from "react";

const TYPE_COLORS = {
  reception: { fill: "#E6F1FB", stroke: "#185FA5", text: "#0C447C" },
  despatch: { fill: "#F1EFE8", stroke: "#5F5E5A", text: "#444441" },
  separator: { fill: "#EAF3DE", stroke: "#3B6D11", text: "#27500A" },
  processing: { fill: "#FAEEDA", stroke: "#854F0B", text: "#663B08" },
};

const SCALE = 5.2;
const OX = 48, OY = 36;
const PAD = 40;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 3;

function sx(mmx) {
  return OX + mmx * SCALE;
}
function sy(mmy) {
  return OY + (55 - mmy) * SCALE;
}

function highlightRadius(w, h) {
  return Math.max(w, h) / 1.5;
}

function contentBounds(equipment) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const e of equipment) {
    const x = sx(e.x);
    const y = sy(e.y);
    const w = e.w * SCALE;
    const h = e.h * SCALE;
    if (e.changed) {
      const r = highlightRadius(w, h);
      const cx = x + w / 2;
      const cy = y + h / 2;
      minX = Math.min(minX, cx - r, x);
      minY = Math.min(minY, cy - r, y - 18);
      maxX = Math.max(maxX, cx + r, x + w);
      maxY = Math.max(maxY, cy + r, y + h);
    } else {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }
  }
  if (!Number.isFinite(minX)) {
    return { width: 920, height: 420, offsetX: 0, offsetY: 0 };
  }
  return {
    width: Math.ceil(maxX - minX + PAD * 2),
    height: Math.ceil(maxY - minY + PAD * 2),
    offsetX: minX - PAD,
    offsetY: minY - PAD,
  };
}

function clampZoom(z) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

function buildPipes(equipment) {
  const byType = {};
  for (const e of equipment) {
    (byType[e.type] ||= []).push(e);
  }

  const flow = ["reception", "despatch", "separator", "processing"];
  const pipes = [];

  for (const src of equipment) {
    const start = flow.indexOf(src.type);
    if (start < 0 || start === flow.length - 1) continue;

    let dst = null;
    for (let i = start + 1; i < flow.length; i++) {
      dst = (byType[flow[i]] || []).find((e) => e.y === src.y);
      if (dst) break;
    }
    if (!dst) continue;

    pipes.push({
      x1: sx(src.x) + src.w * SCALE,
      y1: sy(src.y) + (src.h * SCALE) / 2,
      x2: sx(dst.x),
      y2: sy(dst.y) + (dst.h * SCALE) / 2,
    });
  }

  return pipes;
}

export default function DiagramView({ equipment }) {
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const transformRef = useRef({ zoom: 1, pan: { x: 0, y: 0 } });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const bounds = contentBounds(equipment);
  const ox = bounds.offsetX;
  const oy = bounds.offsetY;
  const pipes = buildPipes(equipment);

  function applyTransform(nextZoom, nextPan) {
    transformRef.current = { zoom: nextZoom, pan: nextPan };
    setZoom(nextZoom);
    setPan(nextPan);
  }

  function fitToView() {
    const el = viewportRef.current;
    if (!el) return;
    const { clientWidth: vw, clientHeight: vh } = el;
    const fit = Math.min(vw / bounds.width, vh / bounds.height) * 0.92;
    const z = clampZoom(fit);
    applyTransform(z, {
      x: (vw - bounds.width * z) / 2,
      y: (vh - bounds.height * z) / 2,
    });
  }

  function zoomAt(factor, clientX, clientY) {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pivotX = clientX == null ? rect.width / 2 : clientX - rect.left;
    const pivotY = clientY == null ? rect.height / 2 : clientY - rect.top;
    const { zoom: prev, pan: p } = transformRef.current;
    const next = clampZoom(prev * factor);
    const ratio = next / prev;
    applyTransform(next, {
      x: pivotX - (pivotX - p.x) * ratio,
      y: pivotY - (pivotY - p.y) * ratio,
    });
  }

  useEffect(() => {
    fitToView();
  }, [equipment, bounds.width, bounds.height]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    function onWheel(e) {
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [bounds.width, bounds.height]);

  function onPointerDown(e) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { pan: p } = transformRef.current;
    dragRef.current = { x: e.clientX - p.x, y: e.clientY - p.y };
  }

  function onPointerMove(e) {
    if (!dragRef.current) return;
    applyTransform(transformRef.current.zoom, {
      x: e.clientX - dragRef.current.x,
      y: e.clientY - dragRef.current.y,
    });
  }

  function onPointerUp(e) {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  return (
    <div className="diagram-canvas">
      <div className="diagram-toolbar">
        <button type="button" onClick={() => zoomAt(1 / 1.2)} title="Zoom out" aria-label="Zoom out">−</button>
        <span className="diagram-zoom-label">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => zoomAt(1.2)} title="Zoom in" aria-label="Zoom in">+</button>
        <button type="button" className="diagram-fit-btn" onClick={fitToView} title="Fit to view">Fit</button>
      </div>

      <div
        ref={viewportRef}
        className="diagram-viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={fitToView}
      >
        <div
          className="diagram-stage"
          style={{
            width: bounds.width,
            height: bounds.height,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <svg
            width={bounds.width}
            height={bounds.height}
            viewBox={`${ox} ${oy} ${bounds.width} ${bounds.height}`}
            style={{ fontFamily: "Arial, sans-serif", display: "block" }}
          >
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M2 1L8 5L2 9" fill="none" stroke="#888780" strokeWidth="1.5" />
              </marker>
            </defs>

            {pipes.map((p, i) => (
              <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
                    stroke="#888780" strokeWidth="2" markerEnd="url(#arrow)" />
            ))}

            {equipment.map((e) => {
              const colors = TYPE_COLORS[e.type] || TYPE_COLORS.despatch;
              const x = sx(e.x), y = sy(e.y);
              const w = e.w * SCALE, h = e.h * SCALE;
              return (
                <g key={e.tag}>
                  <rect x={x} y={y} width={w} height={h} rx="6"
                        fill={colors.fill} stroke={colors.stroke} strokeWidth="1.5" />
                  <text x={x + 10} y={y + 24} fontSize="15" fontWeight="bold" fill={colors.text}>{e.tag}</text>
                  <text x={x + 10} y={y + 44} fontSize="12" fill={colors.text}>{e.spec}</text>
                  {e.changed && (
                    <>
                      <circle cx={x + w / 2} cy={y + h / 2} r={highlightRadius(w, h)}
                              fill="none" stroke="#A32D2D" strokeWidth="2" strokeDasharray="4,3" opacity="0.85" />
                      <text x={x + w - 34} y={y - 6} fontSize="13" fontWeight="bold" fill="#A32D2D">NEW</text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
