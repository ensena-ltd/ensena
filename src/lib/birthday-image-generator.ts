import { birthdayPatternMarks, buildBirthdayCopy, socialFooterText, type BirthdayCardData } from "@/lib/birthday-data";

const BRAND_PRIMARY = "#F80248";
const BRAND_INK = "#2E2E3A";
const BRAND_MUTED = "#6B6B76";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    if (ctx.measureText(attempt).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = attempt;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Renders a shareable birthday card to a PNG blob, generated on demand in
 * the browser — nothing is stored server-side or persisted per user.
 * Privacy: only firstName + role ever reach this function (see
 * BirthdayCardData) — never DOB, age, email, phone, or academic info.
 */
export async function generateBirthdayCardImage(data: BirthdayCardData, size = 1080): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");

  // Background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, size, size);

  // Faint scattered "en" pattern
  const logoImg = await loadImage("/brand/icon.svg");
  for (const mark of birthdayPatternMarks) {
    const w = (mark.sizePct / 100) * size;
    const x = (mark.xPct / 100) * size - w / 2;
    const y = (mark.yPct / 100) * size - w / 2;
    ctx.globalAlpha = mark.opacity;
    ctx.drawImage(logoImg, x, y, w, w);
  }
  ctx.globalAlpha = 1;

  const pad = size * 0.09;
  const contentWidth = size - pad * 2;

  // Top: small Ensena mark
  const markSize = size * 0.07;
  ctx.drawImage(logoImg, size / 2 - markSize / 2, pad, markSize, markSize);

  // Center: emoji + title + message
  const copy = buildBirthdayCopy(data);

  ctx.textAlign = "center";
  ctx.fillStyle = BRAND_INK;
  ctx.font = `${Math.round(size * 0.09)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
  ctx.fillText("🎉", size / 2, size * 0.42);

  ctx.font = `700 ${Math.round(size * 0.052)}px "Segoe UI", system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = BRAND_INK;
  const titleLines = wrapText(ctx, copy.title, contentWidth);
  let cursorY = size * 0.5;
  const titleLineHeight = size * 0.065;
  for (const line of titleLines) {
    ctx.fillText(line, size / 2, cursorY);
    cursorY += titleLineHeight;
  }

  cursorY += size * 0.02;
  ctx.font = `${Math.round(size * 0.032)}px "Segoe UI", system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = BRAND_MUTED;
  const messageLines = wrapText(ctx, copy.message, contentWidth * 0.85);
  const messageLineHeight = size * 0.045;
  for (const line of messageLines) {
    ctx.fillText(line, size / 2, cursorY);
    cursorY += messageLineHeight;
  }

  // Footer
  ctx.font = `600 ${Math.round(size * 0.026)}px "Segoe UI", system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = BRAND_PRIMARY;
  ctx.fillText(socialFooterText, size / 2, size - pad - size * 0.05);

  const footerMarkSize = size * 0.032;
  ctx.drawImage(logoImg, size / 2 - footerMarkSize - size * 0.045, size - pad - footerMarkSize * 0.4, footerMarkSize, footerMarkSize);
  ctx.font = `700 ${Math.round(size * 0.03)}px "Segoe UI", system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = BRAND_INK;
  ctx.textAlign = "left";
  ctx.fillText("ensena", size / 2 + size * 0.01, size - pad - footerMarkSize * 0.4 + footerMarkSize * 0.75);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to generate image."));
    }, "image/png");
  });
}
