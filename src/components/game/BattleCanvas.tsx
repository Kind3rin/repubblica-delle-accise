import { useEffect, useRef } from "react";
import { drawSprite, ensureSprites } from "@/lib/game/sprites";
import type { CombatFrame } from "@/lib/game/types";

function worldToScreen(x: number, z: number, w: number, h: number) {
  const scale = Math.min(w, h) * 0.32;
  return { x: w * 0.5 + x * scale * 1.12, y: h * 0.18 + (z + 1.35) * scale * 0.7, scale };
}

const UNIT_H = { vespa: 46, ragioniere: 52, autobotte: 64 };
const BUILDING_H: Record<string, number> = {
  municipio: 96,
  trivella: 84,
  tesoreria: 78,
  caserma: 80,
  torre: 108,
  deposito: 76,
};

export function BattleCanvas({ frame }: { frame: CombatFrame }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(frame);
  frameRef.current = frame;

  useEffect(() => {
    ensureSprites();
    const canvas = ref.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let running = true;
    const draw = () => {
      if (!running) return;
      const current = frameRef.current;
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

      const collapsing = current.effects.some((e) => e.type === "collapse" && current.elapsed - e.at < 280);
      const shakeX = collapsing ? Math.sin(current.elapsed / 18) * 4 : 0;
      const shakeY = collapsing ? Math.cos(current.elapsed / 14) * 3 : 0;
      ctx.save();
      ctx.translate(shakeX, shakeY);

      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#cfe6dc");
      g.addColorStop(0.45, "#b7cc8d");
      g.addColorStop(1, "#6f9458");
      ctx.fillStyle = g;
      ctx.fillRect(-8, -8, w + 16, h + 16);

      const lanes = [
        { x: -1.35, label: "Sinistra" },
        { x: 0, label: "Centro" },
        { x: 1.35, label: "Destra" },
      ];
      ctx.font = "600 11px Outfit, sans-serif";
      ctx.textAlign = "center";
      for (const lane of lanes) {
        const a = worldToScreen(lane.x, 2.55, w, h);
        const b = worldToScreen(lane.x, -1.55, w, h);
        ctx.strokeStyle = "rgba(244,234,208,0.55)";
        ctx.lineWidth = 22;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.fillStyle = "rgba(29,51,41,0.45)";
        ctx.fillText(lane.label, a.x, a.y + 16);
      }

      const drawables: { z: number; draw: () => void }[] = [];

      for (const building of current.buildings) {
        drawables.push({
          z: building.z,
          draw: () => {
            const p = worldToScreen(building.x, building.z, w, h);
            const dead = building.hp <= 0;
            const height = BUILDING_H[building.id] ?? 80;
            ctx.save();
            if (dead) ctx.filter = "grayscale(0.7) brightness(0.7)";
            const drawn = drawSprite(ctx, building.id, p.x, p.y + 6, height, { alpha: dead ? 0.55 : 1 });
            ctx.restore();
            if (!drawn) {
              ctx.globalAlpha = dead ? 0.35 : 1;
              ctx.fillStyle = dead ? "#6b5344" : "#efe3c4";
              ctx.fillRect(p.x - 28, p.y - 42, 56, 44);
              ctx.fillStyle = dead ? "#4d3b32" : "#c45b3a";
              ctx.beginPath();
              ctx.moveTo(p.x - 32, p.y - 40);
              ctx.lineTo(p.x, p.y - 68);
              ctx.lineTo(p.x + 32, p.y - 40);
              ctx.fill();
              ctx.globalAlpha = 1;
            }
            ctx.fillStyle = "rgba(18,32,26,0.55)";
            ctx.fillRect(p.x - 28, p.y + 10, 56, 7);
            ctx.fillStyle = dead ? "#b4532a" : "#3d6b4a";
            ctx.fillRect(p.x - 28, p.y + 10, 56 * Math.max(0, building.hp / building.maxHp), 7);
          },
        });
      }

      for (const unit of current.units) {
        drawables.push({
          z: unit.z,
          draw: () => {
            const p = worldToScreen(unit.x, unit.z, w, h);
            const hgt = UNIT_H[unit.type];
            const drawn = drawSprite(ctx, unit.type, p.x, p.y + 4, hgt, { flip: unit.type !== "autobotte" });
            if (!drawn) {
              ctx.fillStyle = unit.type === "vespa" ? "#2d4a3a" : unit.type === "ragioniere" ? "#8a5a22" : "#b4532a";
              ctx.beginPath();
              ctx.arc(p.x, p.y, unit.type === "autobotte" ? 12 : 8, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = "rgba(18,32,26,0.5)";
            ctx.fillRect(p.x - 14, p.y - hgt + 4, 28, 4);
            ctx.fillStyle = "#edbb57";
            ctx.fillRect(p.x - 14, p.y - hgt + 4, 28 * Math.max(0, unit.hp / unit.maxHp), 4);
          },
        });
      }

      drawables.sort((a, b) => a.z - b.z);
      for (const item of drawables) item.draw();

      for (const fx of current.effects) {
        const a = worldToScreen(fx.fromX, fx.fromZ, w, h);
        const b = worldToScreen(fx.toX, fx.toZ, w, h);
        const life = Math.max(0, 1 - (current.elapsed - fx.at) / 420);
        if (fx.type === "collapse") {
          ctx.fillStyle = `rgba(80,70,60,${0.35 * life})`;
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, 28 + (1 - life) * 22, 14, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (fx.type === "hit") {
          ctx.fillStyle = `rgba(238,162,82,${0.75 * life})`;
          ctx.beginPath();
          ctx.arc(b.x, b.y - 10, 8 + (1 - life) * 10, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = `rgba(227,183,90,${0.85 * life})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y - 16);
          ctx.lineTo(b.x, b.y - 24);
          ctx.stroke();
        }
      }

      if (current.smokeUntil > current.elapsed) {
        ctx.fillStyle = "rgba(190,200,190,0.28)";
        for (let i = 0; i < 8; i += 1) {
          const p = worldToScreen(((i % 3) - 1) * 1.2, (i % 4) - 0.4, w, h);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, 48, 18, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (current.rallyUntil > current.elapsed) {
        ctx.strokeStyle = "rgba(238,162,82,0.45)";
        ctx.lineWidth = 6;
        ctx.strokeRect(8, 8, w - 16, h - 16);
      }

      ctx.restore();

      ctx.fillStyle = "rgba(17,45,37,0.72)";
      roundPill(ctx, 12, 12, 168, 28);
      ctx.fill();
      ctx.fillStyle = "#f7f6ee";
      ctx.font = "600 12px Outfit, sans-serif";
      ctx.textAlign = "left";
      const stars = "★".repeat(current.stars) + "☆".repeat(3 - current.stars);
      ctx.fillText(`${stars}  ${Math.round(current.destruction * 100)}%`, 24, 31);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={wrapRef} className="h-full min-h-[220px] w-full">
      <canvas ref={ref} className="h-full w-full" />
    </div>
  );
}

function roundPill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
