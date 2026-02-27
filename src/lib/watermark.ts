/**
 * Shared watermark utilities for Digis video recordings and clips.
 * Used by useStreamClipper (clips) and useStreamRecorder (manual recordings).
 */

export interface WatermarkConfig {
  logoUrl: string;
  creatorUsername: string;
}

/**
 * Draw Digis watermark overlay onto a canvas context.
 * Renders: semi-transparent pill (bottom-right) with Digis logo + "digis.cc/{username}" text.
 * All dimensions scale responsively to video resolution.
 */
export function drawWatermarkOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  username: string,
  logo: HTMLImageElement | null,
  logoLoaded: boolean,
) {
  const padding = Math.round(Math.max(w * 0.015, 12));
  const innerPad = Math.round(Math.max(w * 0.01, 8));
  const hasLogo = logoLoaded && logo !== null && logo.naturalWidth > 0;

  // Scale sizes relative to video resolution
  const logoH = Math.round(Math.max(h * 0.045, 20));
  const logoW = hasLogo ? Math.round(logoH * (logo.naturalWidth / logo.naturalHeight)) : 0;
  const fontSize = Math.round(Math.max(h * 0.024, 12));
  const urlText = `digis.cc/${username}`;

  ctx.save();

  // Measure text width
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`;
  const textW = ctx.measureText(urlText).width;

  // Compute watermark block size
  const contentW = Math.max(hasLogo ? logoW : 0, textW);
  const gapBetween = hasLogo ? Math.round(h * 0.005) : 0;
  const contentH = (hasLogo ? logoH + gapBetween : 0) + fontSize;
  const blockW = contentW + innerPad * 2;
  const blockH = contentH + innerPad * 2;
  const blockX = w - padding - blockW;
  const blockY = h - padding - blockH;

  // Semi-transparent dark background pill
  const r = Math.round(Math.max(h * 0.008, 5));
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.moveTo(blockX + r, blockY);
  ctx.lineTo(blockX + blockW - r, blockY);
  ctx.quadraticCurveTo(blockX + blockW, blockY, blockX + blockW, blockY + r);
  ctx.lineTo(blockX + blockW, blockY + blockH - r);
  ctx.quadraticCurveTo(blockX + blockW, blockY + blockH, blockX + blockW - r, blockY + blockH);
  ctx.lineTo(blockX + r, blockY + blockH);
  ctx.quadraticCurveTo(blockX, blockY + blockH, blockX, blockY + blockH - r);
  ctx.lineTo(blockX, blockY + r);
  ctx.quadraticCurveTo(blockX, blockY, blockX + r, blockY);
  ctx.closePath();
  ctx.fill();

  // Draw logo centered in block
  if (hasLogo) {
    ctx.globalAlpha = 0.92;
    const logoX = blockX + (blockW - logoW) / 2;
    const logoY = blockY + innerPad;
    ctx.drawImage(logo, logoX, logoY, logoW, logoH);
  }

  // Draw URL text centered below logo
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(urlText, blockX + blockW / 2, blockY + innerPad + (hasLogo ? logoH + gapBetween : 0));

  ctx.restore();
}

/**
 * Preload a watermark logo image. Returns a promise that resolves with the loaded image.
 */
export function preloadWatermarkLogo(logoUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load watermark logo'));
    img.src = logoUrl;
  });
}
