const NAMES = [
  "vespa",
  "ragioniere",
  "autobotte",
  "municipio",
  "trivella",
  "tesoreria",
  "caserma",
  "torre",
  "deposito",
] as const;

const cache: Record<string, HTMLImageElement> = {};
let started = false;

export function ensureSprites() {
  if (started || typeof Image === "undefined") return;
  started = true;
  for (const name of NAMES) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.src = `/sprites/${name}.png`;
    cache[name] = img;
  }
}

export function getSprite(name: string) {
  const img = cache[name];
  if (img && img.complete && img.naturalWidth > 0) return img;
  return null;
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  name: string,
  cx: number,
  baselineY: number,
  height: number,
  opts?: { flip?: boolean; alpha?: number; shadow?: boolean },
) {
  const img = getSprite(name);
  if (!img) return false;
  const scale = height / img.naturalHeight;
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.save();
  ctx.globalAlpha = opts?.alpha ?? 1;
  if (opts?.shadow !== false) {
    ctx.fillStyle = "rgba(24, 42, 32, 0.22)";
    ctx.beginPath();
    ctx.ellipse(cx, baselineY + 4, w * 0.28, h * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (opts?.flip) {
    ctx.translate(cx, baselineY);
    ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h, w, h);
  } else {
    ctx.drawImage(img, cx - w / 2, baselineY - h, w, h);
  }
  ctx.restore();
  return true;
}
