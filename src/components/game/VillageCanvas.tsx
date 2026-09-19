import { useEffect, useRef } from "react";
import { BUILDING_LAYOUT, BUILDING_ORDER } from "@/lib/game/catalog";
import { drawSprite, ensureSprites } from "@/lib/game/sprites";
import type { BuildingId, GameState } from "@/lib/game/types";

const C = {
  grass: "#7fa86c",
  grassDark: "#5f8a55",
  grassLite: "#b5cc8f",
  road: "#cbb58a",
  water: "#7eb3b0",
  pine: "#2f5d44",
  pineDark: "#1d3f30",
  cream: "#f4ead0",
  roof: "#c45b3a",
  gold: "#e3b75a",
  ink: "#1d3329",
};

const SPRITE_H: Record<BuildingId, number> = {
  municipio: 1.22,
  trivella: 1.08,
  tesoreria: 1.0,
  caserma: 1.02,
  torre: 1.32,
  deposito: 0.96,
};

function project(x: number, z: number, w: number, h: number) {
  const scale = Math.min(w, h) * 0.3;
  const sx = w * 0.5 + (x - z * 0.12) * scale;
  const sy = h * 0.5 + z * scale * 0.7;
  return { x: sx, y: sy, scale };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCypress(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = "rgba(24, 42, 32, 0.2)";
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.08, s * 0.18, s * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.pineDark;
  ctx.fillRect(x - s * 0.04, y - s * 0.1, s * 0.08, s * 0.22);
  ctx.fillStyle = "#2c5a3c";
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.55);
  ctx.quadraticCurveTo(x + s * 0.28, y - s * 0.4, x, y + s * 0.05);
  ctx.quadraticCurveTo(x - s * 0.28, y - s * 0.4, x, y - s * 1.55);
  ctx.fill();
  ctx.fillStyle = "#3f7550";
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.4);
  ctx.quadraticCurveTo(x + s * 0.16, y - s * 0.5, x, y - s * 0.15);
  ctx.quadraticCurveTo(x - s * 0.1, y - s * 0.5, x, y - s * 1.4);
  ctx.fill();
}

function drawLamp(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.strokeStyle = "#5c4630";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - s);
  ctx.stroke();
  ctx.fillStyle = "#f0d48a";
  ctx.beginPath();
  ctx.ellipse(x, y - s, s * 0.18, s * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawFountain(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
  ctx.fillStyle = "rgba(24, 42, 32, 0.18)";
  ctx.beginPath();
  ctx.ellipse(x, y + 6, s * 0.9, s * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d7c4a4";
  ctx.beginPath();
  ctx.ellipse(x, y, s * 0.82, s * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.water;
  ctx.beginPath();
  ctx.ellipse(x, y - 2, s * 0.58, s * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#efe6d2";
  ctx.fillRect(x - 4, y - s * 0.55, 8, s * 0.45);
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  for (let i = 0; i < 5; i += 1) {
    const ox = Math.sin(t * 2.4 + i) * 6;
    ctx.beginPath();
    ctx.arc(x + ox, y - s * 0.55 - ((t * 28 + i * 11) % (s * 0.5)), 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFallbackBuilding(
  ctx: CanvasRenderingContext2D,
  id: BuildingId,
  px: number,
  py: number,
  scale: number,
  level: number,
) {
  const s = scale * (0.42 + level * 0.04);
  ctx.fillStyle = "rgba(24, 42, 32, 0.22)";
  ctx.beginPath();
  ctx.ellipse(px, py + s * 0.42, s * 0.62, s * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  if (id === "torre") {
    ctx.fillStyle = "#cfc3ab";
    roundRect(ctx, px - s * 0.22, py - s * 1.15, s * 0.44, s * 1.35, 6);
    ctx.fill();
    ctx.fillStyle = C.roof;
    ctx.beginPath();
    ctx.moveTo(px, py - s * 1.7);
    ctx.lineTo(px + s * 0.32, py - s * 1.05);
    ctx.lineTo(px - s * 0.32, py - s * 1.05);
    ctx.fill();
  } else if (id === "trivella") {
    ctx.fillStyle = "#d9c7a3";
    roundRect(ctx, px - s * 0.46, py - s * 0.28, s * 0.92, s * 0.5, 8);
    ctx.fill();
    ctx.strokeStyle = "#9a7b4a";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(px - s * 0.08, py - s * 0.2);
    ctx.lineTo(px + s * 0.02, py - s * 1.05);
    ctx.stroke();
  } else {
    const w = id === "municipio" ? s * 1.15 : s * 0.95;
    const h = id === "deposito" ? s * 0.55 : s * 0.7;
    ctx.fillStyle = "#ead7b8";
    roundRect(ctx, px - w / 2, py - h * 0.7, w, h, 8);
    ctx.fill();
    ctx.fillStyle = C.roof;
    ctx.beginPath();
    ctx.moveTo(px - w / 2 - 6, py - h * 0.62);
    ctx.lineTo(px, py - h * 1.28);
    ctx.lineTo(px + w / 2 + 6, py - h * 0.62);
    ctx.fill();
  }
}

export function VillageCanvas({
  state,
  selected,
  onSelect,
  reducedMotion,
}: {
  state: GameState;
  selected: BuildingId;
  onSelect: (id: BuildingId) => void;
  reducedMotion: boolean;
}) {
  const stateRef = useRef(state);
  const selectedRef = useRef(selected);
  stateRef.current = state;
  selectedRef.current = selected;
  const ref = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hits = useRef<{ id: BuildingId; x: number; y: number; r: number }[]>([]);

  useEffect(() => {
    ensureSprites();
    const canvas = ref.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    let running = true;

    const draw = () => {
      if (!running) return;
      const current = stateRef.current;
      const selectedId = selectedRef.current;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w < 8 || h < 8) {
        raf = requestAnimationFrame(draw);
        return;
      }
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#d7eef6");
      sky.addColorStop(0.38, "#e7f3d8");
      sky.addColorStop(1, "#8fb56f");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "#f4e2a8";
      ctx.beginPath();
      ctx.arc(w * 0.86, h * 0.12, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.beginPath();
      ctx.ellipse(w * 0.18, h * 0.11, 54, 16, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.26, h * 0.1, 36, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#6d9a62";
      ctx.beginPath();
      ctx.ellipse(w * 0.22, h * 0.42, w * 0.28, h * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#7eab6c";
      ctx.beginPath();
      ctx.ellipse(w * 0.8, h * 0.4, w * 0.26, h * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = C.grassDark;
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.64, w * 0.48, h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.grass;
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.61, w * 0.44, h * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#d7c79a";
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.58, w * 0.16, h * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = C.road;
      ctx.lineWidth = Math.max(16, w * 0.042);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(w * 0.08, h * 0.8);
      ctx.quadraticCurveTo(w * 0.5, h * 0.92, w * 0.94, h * 0.7);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.32)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 10]);
      ctx.stroke();
      ctx.setLineDash([]);

      drawFountain(ctx, w * 0.5, h * 0.5, 34, reducedMotion ? 0 : t);
      drawCypress(ctx, w * 0.1, h * 0.46, 38);
      drawCypress(ctx, w * 0.9, h * 0.42, 46);
      drawCypress(ctx, w * 0.84, h * 0.74, 32);
      drawCypress(ctx, w * 0.14, h * 0.72, 30);
      drawLamp(ctx, w * 0.32, h * 0.78, 28);
      drawLamp(ctx, w * 0.7, h * 0.8, 26);

      hits.current = [];
      const order = [...BUILDING_ORDER].sort((a, b) => BUILDING_LAYOUT[a].z - BUILDING_LAYOUT[b].z);
      for (const id of order) {
        const loc = BUILDING_LAYOUT[id];
        const p = project(loc.x, loc.z, w, h);
        const building = current.buildings.find((b) => b.id === id)!;
        const height = p.scale * SPRITE_H[id] * (0.92 + building.level * 0.05);
        const drawn = drawSprite(ctx, id, p.x, p.y + 8, height);
        if (!drawn) drawFallbackBuilding(ctx, id, p.x, p.y, p.scale, building.level);

        if (building.upgradeEndsAt) {
          ctx.strokeStyle = C.gold;
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.arc(p.x, p.y - height * 0.45, height * 0.42, t, t + Math.PI * 1.4);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        if (selectedId === id) {
          ctx.strokeStyle = "#f7f1dc";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y + 10, height * 0.32, height * 0.09, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        hits.current.push({ id, x: p.x, y: p.y - height * 0.35, r: Math.max(36, height * 0.42) });
      }

      const vespaX = w * 0.12 + ((t * 36) % (w * 0.76));
      const vespaY = h * 0.8 + Math.sin(t * 3) * 2;
      if (!drawSprite(ctx, "vespa", vespaX, vespaY, 42, { flip: true, shadow: false })) {
        ctx.fillStyle = C.ink;
        ctx.beginPath();
        ctx.ellipse(vespaX, vespaY, 11, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = C.gold;
        ctx.fillRect(vespaX - 6, vespaY - 10, 14, 8);
      }

      if (!reducedMotion) {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        const bx = w * 0.7 + Math.sin(t * 0.4) * 40;
        ctx.beginPath();
        ctx.ellipse(bx, h * 0.16, 7, 2.5, 0.2, 0, Math.PI * 2);
        ctx.ellipse(bx + 18, h * 0.18, 6, 2.2, -0.2, 0, Math.PI * 2);
        ctx.fill();
        t += 0.016;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  return (
    <div ref={wrapRef} className="relative h-full min-h-0 w-full overflow-hidden">
      <canvas
        ref={ref}
        className="h-full w-full touch-manipulation"
        onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = event.clientX - bounds.left;
          const y = event.clientY - bounds.top;
          let best: (typeof hits.current)[number] | null = null;
          let bestD = 9999;
          for (const hit of hits.current) {
            const d = Math.hypot(hit.x - x, hit.y - y);
            if (d < hit.r && d < bestD) {
              best = hit;
              bestD = d;
            }
          }
          if (best) onSelect(best.id);
        }}
      />
    </div>
  );
}
