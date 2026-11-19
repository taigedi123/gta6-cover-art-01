// Neon Bay Cover Studio — the cover renderer.
// Draws GTA-style multi-panel poster art on any 2D canvas: photo panels in one of
// six layouts, a Vice City sunset / neon colour grade, bold Anton caption lettering
// with a Pacifico script subtitle, grain, vignette and a badge ribbon.
// Everything is drawn from the photos on the user's own machine; nothing is fetched.

export const EXPORT_SIZES = [
  { id: '1080x1080', w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  { id: '1080x1350', w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  { id: '1920x1080', w: 1920, h: 1080, label: 'Landscape 1920 x 1080' },
];

export const GRADES = [
  { id: 'sunset', label: 'Vice Sunset', hint: 'orange-pink dusk' },
  { id: 'neon', label: 'Neon Night', hint: 'magenta over teal' },
  { id: 'gold', label: 'Vice Gold', hint: 'warm golden hour' },
  { id: 'teal', label: 'Palm Teal', hint: 'cool teal shadows' },
  { id: 'noir', label: 'Noir', hint: 'high-contrast mono' },
  { id: 'original', label: 'Original', hint: 'no grade' },
];

export const CAPTION_STYLES = [
  { id: 'sunset', label: 'Sunset gradient' },
  { id: 'white', label: 'Bold white' },
  { id: 'neon', label: 'Neon glow' },
  { id: 'halftone', label: 'Halftone block' },
  { id: 'outline', label: 'Outline' },
];

// A layout is a function of the cover size returning panel rects (fractions of the
// cover) and the caption zone. Panels carry a snapshot tilt in degrees and a
// polaroid flag for the white snapshot border.
export const LAYOUTS = [
  { id: 'grid9', label: 'Nine-Panel Grid', hint: '3 x 3 poster grid' },
  { id: 'hero3', label: 'Hero + Three', hint: 'big hero, three stacked' },
  { id: 'fullbleed', label: 'Full Bleed', hint: 'one photo, edge to edge' },
  { id: 'tilted', label: 'Tilted Snapshots', hint: 'polaroid snaps on a sunset sky' },
  { id: 'bands', label: 'Sunset Bands', hint: 'four horizontal strips' },
  { id: 'duo', label: 'Duo Split', hint: 'two tall halves' },
];

/** Panels and caption zone for a layout, in fractions of the cover (0..1). */
export function layoutGeometry(layoutId, w, h) {
  const g = 0.014; // gutter between panels, as a fraction of the cover width
  const gv = g * (w / h); // the same gutter in pixels, as a fraction of the height
  const capH = 0.21; // caption band height, as a fraction of the cover height
  const top = 1 - capH;
  const band = { x: 0, y: top, w: 1, h: capH, overlay: false };
  switch (layoutId) {
    case 'grid9': {
      const panels = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          panels.push({
            x: g + c * (1 - 2 * g) / 3, y: gv + r * (top - 2 * gv) / 3,
            w: (1 - 2 * g) / 3 - g, h: (top - 2 * gv) / 3 - gv,
            rot: 0, polaroid: false,
          });
        }
      }
      return { panels, caption: band, sky: false };
    }
    case 'hero3': {
      const heroW = 0.62;
      return {
        panels: [
          { x: g, y: gv, w: heroW - 1.5 * g, h: top - 2 * gv, rot: 0, polaroid: false },
          { x: heroW + 0.5 * g, y: gv, w: 1 - heroW - 1.5 * g, h: (top - 2 * gv) / 3 - gv, rot: 0, polaroid: false },
          { x: heroW + 0.5 * g, y: gv + (top - 2 * gv) / 3, w: 1 - heroW - 1.5 * g, h: (top - 2 * gv) / 3 - gv, rot: 0, polaroid: false },
          { x: heroW + 0.5 * g, y: gv + 2 * (top - 2 * gv) / 3, w: 1 - heroW - 1.5 * g, h: (top - 2 * gv) / 3 - gv, rot: 0, polaroid: false },
        ],
        caption: band, sky: false,
      };
    }
    case 'fullbleed':
      return {
        panels: [{ x: 0, y: 0, w: 1, h: 1, rot: 0, polaroid: false }],
        caption: { x: 0, y: top, w: 1, h: capH, overlay: true }, sky: false,
      };
    case 'tilted': {
      const pw = 0.30;
      // Keep the snapshots from going tall and thin on portrait covers: cap
      // the height so a panel stays at least 0.6 as wide as it is tall.
      const ph = Math.min(top * 0.78, (pw * (w / h)) / 0.6);
      const y0 = (top - ph) / 2;
      return {
        panels: [
          { x: 0.05, y: y0 + 0.04, w: pw, h: ph, rot: -6, polaroid: true },
          { x: 0.35, y: y0, w: pw, h: ph, rot: 2.5, polaroid: true },
          { x: 0.65, y: y0 + 0.05, w: pw, h: ph, rot: 5, polaroid: true },
        ],
        caption: band, sky: true,
      };
    }
    case 'bands': {
      const heights = [0.30, 0.20, 0.24];
      const panels = [];
      let y = 0;
      for (const hh of heights) {
        panels.push({ x: 0, y, w: 1, h: hh * top, rot: 0, polaroid: false });
        y += hh * top;
      }
      panels.push({ x: 0, y, w: 1, h: top - y, rot: 0, polaroid: false });
      return { panels, caption: band, sky: false };
    }
    case 'duo':
    default:
      return {
        panels: [
          { x: g, y: gv, w: 0.5 - 1.5 * g, h: top - 2 * gv, rot: 0, polaroid: false },
          { x: 0.5 + 0.5 * g, y: gv, w: 0.5 - 1.5 * g, h: top - 2 * gv, rot: 0, polaroid: false },
        ],
        caption: band, sky: false,
      };
  }
}

/** How many panels a layout has. */
export function panelCount(layoutId) {
  return layoutGeometry(layoutId, 100, 100).panels.length;
}

// Deterministic pseudo-random, so a cover renders the same every time.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;
/** A small grey-noise tile used for the film-grain overlay. */
function getGrainTile() {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas');
  c.width = 140; c.height = 140;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(140, 140);
  const rnd = mulberry32(20261119);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 96 + Math.floor(rnd() * 64);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

/** Draws one photo into a panel rect: cover-fit, pan/zoom/rotate, grade, border. */
export function drawPanelPhoto(ctx, panel, photo, grade, w, h) {
  const px = panel.x * w, py = panel.y * h, pw = panel.w * w, ph = panel.h * h;
  if (!photo || !pw || !ph) return;
  const border = panel.polaroid ? Math.max(6, pw * 0.035) : 0;
  const foot = panel.polaroid ? Math.max(18, pw * 0.11) : 0;
  const iw = pw - border * 2, ih = ph - border * 2 - foot;

  // Render the photo (with its grade) onto a panel-sized offscreen canvas.
  const off = document.createElement('canvas');
  off.width = Math.max(2, Math.round(iw));
  off.height = Math.max(2, Math.round(ih));
  const o = off.getContext('2d');
  const img = photo.img;
  const base = Math.max(off.width / img.naturalWidth, off.height / img.naturalHeight);
  const scale = base * (photo.zoom || 1);
  const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
  const dx = (off.width - dw) / 2 + (photo.panX || 0) * off.width * 0.25;
  const dy = (off.height - dh) / 2 + (photo.panY || 0) * off.height * 0.25;
  o.filter = gradeFilter(grade);
  o.drawImage(img, dx, dy, dw, dh);
  o.filter = 'none';
  applyGradeOverlay(o, off.width, off.height, grade);

  ctx.save();
  ctx.translate(px + pw / 2, py + ph / 2);
  ctx.rotate(((panel.rot || 0) + (photo.rot || 0)) * Math.PI / 180);
  if (panel.polaroid) {
    ctx.shadowColor = 'rgba(10, 4, 24, 0.45)';
    ctx.shadowBlur = pw * 0.03;
    ctx.shadowOffsetY = pw * 0.012;
    ctx.fillStyle = '#fdf8ef';
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    ctx.shadowColor = 'transparent';
  }
  ctx.drawImage(off, -pw / 2 + border, -ph / 2 + border, iw, ih);
  if (!panel.polaroid) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = Math.max(1, pw * 0.004);
    ctx.strokeRect(-pw / 2 + border, -ph / 2 + border, iw, ih);
  }
  ctx.restore();
}

/** CSS canvas filter for the photo before the colour-grade overlay. */
export function gradeFilter(grade) {
  switch (grade) {
    case 'sunset': return 'saturate(1.35) contrast(1.08) brightness(1.03)';
    case 'neon': return 'saturate(1.5) contrast(1.12) brightness(0.97)';
    case 'gold': return 'saturate(1.3) contrast(1.05) sepia(0.22) brightness(1.04)';
    case 'teal': return 'saturate(1.2) contrast(1.1) brightness(0.98)';
    case 'noir': return 'grayscale(1) contrast(1.18) brightness(1.02)';
    default: return 'none';
  }
}

/** Paints the colour-grade wash over a photo that is already drawn. */
export function applyGradeOverlay(ctx, w, h, grade) {
  if (grade === 'original') return;
  ctx.save();
  let grad;
  switch (grade) {
    case 'sunset':
      grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(255, 190, 90, 0.10)');
      grad.addColorStop(0.55, 'rgba(255, 110, 70, 0.10)');
      grad.addColorStop(1, 'rgba(190, 40, 130, 0.22)');
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(255, 120, 60, 0.10)'; ctx.fillRect(0, 0, w, h);
      break;
    case 'neon':
      grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, 'rgba(255, 45, 150, 0.20)');
      grad.addColorStop(0.5, 'rgba(120, 40, 180, 0.08)');
      grad.addColorStop(1, 'rgba(0, 220, 200, 0.20)');
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      break;
    case 'gold':
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(255, 180, 60, 0.28)'; ctx.fillRect(0, 0, w, h);
      break;
    case 'teal':
      grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(0, 200, 190, 0.10)');
      grad.addColorStop(1, 'rgba(10, 40, 70, 0.26)');
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      break;
    case 'noir':
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(20, 20, 30, 0.12)'; ctx.fillRect(0, 0, w, h);
      break;
    default:
      break;
  }
  ctx.restore();
}

/** The sunset-sky backdrop behind the tilted-snapshot layout. */
export function drawSunsetSky(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#2a1052');
  sky.addColorStop(0.42, '#c22a7a');
  sky.addColorStop(0.68, '#ff7a3d');
  sky.addColorStop(1, '#ffc46b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // Low sun and its glow.
  const cx = w * 0.72, cy = h * 0.52, r = h * 0.11;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3.2);
  glow.addColorStop(0, 'rgba(255, 230, 160, 0.85)');
  glow.addColorStop(0.4, 'rgba(255, 160, 90, 0.35)');
  glow.addColorStop(1, 'rgba(255, 120, 80, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 3.2, cy - r * 3.2, r * 6.4, r * 6.4);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  // Palm-silhouette horizon line.
  ctx.fillStyle = 'rgba(26, 8, 46, 0.85)';
  ctx.fillRect(0, h * 0.78, w, h * 0.02);
}

/** A five-point star path, for the heat meter. */
function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Draws the heat meter: gold stars for the cover's heat, 1-5, from left x. */
export function drawHeatStars(ctx, x, cy, size, stars) {
  const gap = size * 1.35;
  for (let i = 0; i < 5; i++) {
    starPath(ctx, x + size / 2 + i * gap, cy, size / 2);
    ctx.fillStyle = i < stars ? '#ffc93d' : 'rgba(255, 255, 255, 0.28)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(20, 8, 40, 0.55)';
    ctx.lineWidth = Math.max(1, size * 0.06);
    ctx.stroke();
  }
}

/** Draws the badge ribbon: a small pill naming the studio. */
export function drawBadgeRibbon(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#160a2e';
  ctx.strokeStyle = '#ffc93d';
  ctx.lineWidth = Math.max(2, h * 0.08);
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffe9a8';
  ctx.font = `bold ${h * 0.42}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NEON BAY  •  EST. 2026', x + w / 2, y + h / 2 + h * 0.03);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Fits the title to the zone, shrinking the font until it fits. */
function fitTitleFont(ctx, text, zoneW, startSize) {
  let size = startSize;
  ctx.font = `${size}px Anton, sans-serif`;
  while (size > 12 && ctx.measureText(text).width > zoneW) {
    size *= 0.94;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  return size;
}

/** Draws the caption block: title, script subtitle, stars, badge. */
export function drawCaptionBlock(ctx, zone, state, w, h) {
  const zx = zone.x * w, zy = zone.y * h, zw = zone.w * w, zh = zone.h * h;
  const style = state.captionStyle || 'sunset';
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();

  // The band behind the lettering.
  if (!zone.overlay) {
    if (style === 'halftone') {
      const bg = ctx.createLinearGradient(0, zy, 0, zy + zh);
      bg.addColorStop(0, '#1c0b33'); bg.addColorStop(1, '#3d1157');
      ctx.fillStyle = bg; ctx.fillRect(zx, zy, zw, zh);
      // Halftone dots fading down the band.
      const step = Math.max(6, zh * 0.09);
      for (let yy = zy + step; yy < zy + zh; yy += step) {
        for (let xx = zx + step / 2; xx < zx + zw; xx += step) {
          const fade = 1 - (yy - zy) / zh;
          ctx.fillStyle = `rgba(255, 93, 162, ${0.22 * fade})`;
          ctx.beginPath(); ctx.arc(xx, yy, step * 0.16 * fade + 0.5, 0, Math.PI * 2); ctx.fill();
        }
      }
    } else if (style === 'neon') {
      const bg = ctx.createLinearGradient(0, zy, 0, zy + zh);
      bg.addColorStop(0, '#150826'); bg.addColorStop(1, '#2b0f45');
      ctx.fillStyle = bg; ctx.fillRect(zx, zy, zw, zh);
    } else {
      const bg = ctx.createLinearGradient(0, zy, 0, zy + zh);
      bg.addColorStop(0, '#200b38'); bg.addColorStop(1, '#12061f');
      ctx.fillStyle = bg; ctx.fillRect(zx, zy, zw, zh);
    }
    ctx.fillStyle = '#ff5da2';
    ctx.fillRect(zx, zy, zw, Math.max(2, zh * 0.02));
  } else {
    // Overlay caption: a scrim rising from the foot of the photo.
    const scrim = ctx.createLinearGradient(0, zy - zh * 0.5, 0, zy + zh);
    scrim.addColorStop(0, 'rgba(18, 6, 31, 0)');
    scrim.addColorStop(1, 'rgba(18, 6, 31, 0.82)');
    ctx.fillStyle = scrim;
    ctx.fillRect(zx, zy - zh * 0.5, zw, zh * 1.5);
  }

  // Stars and badge sit at the band's ends; the title centers in the space
  // left between them, so wide titles never run over the stars or the badge.
  const starsOn = state.stars > 0 && zw > zh * 3.4;
  const badgeOn = state.badge && zw > zh * 5.2;
  const titleX0 = zx + (starsOn ? zw * 0.17 : zw * 0.04);
  const titleX1 = zx + zw - (badgeOn ? zw * 0.23 : zw * 0.04);
  const titleCx = (titleX0 + titleX1) / 2;
  const titleW = titleX1 - titleX0;

  const titleY = zy + zh * (subtitle ? 0.44 : 0.58);
  const subY = zy + zh * 0.78;
  if (title) {
    let size = fitTitleFont(ctx, title, titleW, zh * 0.52);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    if (style === 'sunset' || style === 'halftone') {
      const grad = ctx.createLinearGradient(0, titleY - size * 0.5, 0, titleY + size * 0.5);
      grad.addColorStop(0, '#ffe9a8');
      grad.addColorStop(0.45, '#ff9a3d');
      grad.addColorStop(1, '#ff2e88');
      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = size * 0.12;
      ctx.shadowOffsetY = size * 0.04;
    } else if (style === 'neon') {
      ctx.fillStyle = '#ff5da2';
      ctx.shadowColor = '#ff2e88';
      ctx.shadowBlur = size * 0.45;
    } else if (style === 'outline') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, size * 0.06);
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = size * 0.1;
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = size * 0.14;
      ctx.shadowOffsetY = size * 0.05;
    }
    if (style === 'outline') {
      ctx.strokeText(title, titleCx, titleY);
    } else {
      ctx.strokeStyle = 'rgba(22, 8, 40, 0.85)';
      ctx.lineWidth = Math.max(1.5, size * 0.045);
      ctx.strokeText(title, titleCx, titleY);
      ctx.fillText(title, titleCx, titleY);
    }
    ctx.restore();
  }
  if (subtitle) {
    const subSize = Math.max(10, zh * 0.17);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = style === 'neon' ? '#7df9e8' : '#ffe9a8';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = subSize * 0.25;
    ctx.fillText(subtitle, zx + zw / 2, subY);
    ctx.shadowBlur = 0;
  }

  if (starsOn) {
    // Five stars at a size that fits the space reserved at the band's left.
    const starSize = Math.min(zh * 0.17, (zw * 0.14) / 6.4);
    drawHeatStars(ctx, zx + zw * 0.025, zy + zh * 0.5, starSize, state.stars);
  }
  if (badgeOn) {
    const bw = zw * 0.17, bh = zh * 0.24;
    drawBadgeRibbon(ctx, zx + zw - bw - zw * 0.03, zy + zh * 0.5 - bh / 2, bw, bh);
  }
}

/** Film grain over the whole cover. */
export function drawGrain(ctx, w, h, amount) {
  const tile = getGrainTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** A soft dark vignette around the edges. */
export function drawVignette(ctx, w, h) {
  const r = Math.hypot(w, h) / 2;
  const grad = ctx.createRadialGradient(w / 2, h / 2, r * 0.55, w / 2, h / 2, r);
  grad.addColorStop(0, 'rgba(10, 4, 24, 0)');
  grad.addColorStop(1, 'rgba(10, 4, 24, 0.34)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Renders the whole cover onto ctx at the canvas's own size.
 * `state` is the editor state; `photos` is the array of loaded photos
 * ({img, id}); `state.panels` holds one entry per panel of the layout.
 */
export function renderCover(ctx, w, h, state, photos) {
  const geo = layoutGeometry(state.layout, w, h);
  // Backdrop: a deep plum field, or the sunset sky for the tilted layout.
  if (geo.sky) {
    drawSunsetSky(ctx, w, h);
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#1c0b33');
    bg.addColorStop(1, '#12061f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }
  // Panels, in order, each with its own photo and crop.
  geo.panels.forEach((panel, i) => {
    const p = (state.panels && state.panels[i]) || {};
    const photo = photos[p.photo ?? 0] || photos[0] || null;
    drawPanelPhoto(ctx, panel, { ...p, img: photo ? photo.img : null }, state.grade, w, h);
  });
  // Caption band on top.
  drawCaptionBlock(ctx, geo.caption, state, w, h);
  // Poster frame.
  if (state.frame) {
    ctx.strokeStyle = '#fdf8ef';
    ctx.lineWidth = Math.max(3, w * 0.006);
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
    ctx.strokeStyle = 'rgba(253, 248, 239, 0.4)';
    ctx.lineWidth = Math.max(1, w * 0.0015);
    ctx.strokeRect(w * 0.014, h * 0.014, w * 0.972, h * 0.972);
  }
  if (state.grain) drawGrain(ctx, w, h, 0.5);
  if (state.vignette) drawVignette(ctx, w, h);
}
