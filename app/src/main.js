// Neon Bay Cover Studio — wires the editor page: photos in, caption typed,
// layout picked, panel cropped, cover out in all three post sizes.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import {
  EXPORT_SIZES, GRADES, CAPTION_STYLES, LAYOUTS,
  layoutGeometry, renderCover,
} from './cover.js';
import {
  defaultState, defaultPanel, resetPanelsForLayout, fillAllPanels,
  unfillAllPanels, favorTopCrops, snapshotState, restoreState, UndoStack,
  loadImage, loadUserPhoto, loadSamplePhotos,
} from './state.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const statusEl = $('status');

let state = defaultState();
let photos = [];
let undoStack = new UndoStack();
let userPhotoCount = 0;
let previewScale = 1; // preview canvas pixels per cover pixel

function status(text) {
  statusEl.textContent = text;
}

/** Redraws the preview canvas from the current state. */
export function redraw() {
  const size = EXPORT_SIZES.find((s) => s.id === state.size) || EXPORT_SIZES[0];
  // A cover-only screenshot scene renders at the gate's largest side; the
  // editor preview stays small for speed.
  const maxSide = document.body.classList.contains('shot-cover') ? 1280 : 720;
  const scale = Math.min(maxSide / size.w, maxSide / size.h);
  const pw = Math.round(size.w * scale), ph = Math.round(size.h * scale);
  if (preview.width !== pw || preview.height !== ph) {
    preview.width = pw; preview.height = ph;
  }
  previewScale = pw / size.w;
  const ctx = preview.getContext('2d');
  renderCover(ctx, pw, ph, state, photos);
  drawSelectionOutline(ctx);
  updatePanelControls();
}

/** Outlines the selected panel on the preview (editor only, never exported). */
function drawSelectionOutline(ctx) {
  const geo = layoutGeometry(state.layout, preview.width, preview.height);
  const panel = geo.panels[state.selected];
  if (!panel) return;
  const px = panel.x * preview.width, py = panel.y * preview.height;
  const pw = panel.w * preview.width, ph = panel.h * preview.height;
  ctx.save();
  ctx.translate(px + pw / 2, py + ph / 2);
  ctx.rotate(((panel.rot || 0) + ((state.panels[state.selected] || {}).rot || 0)) * Math.PI / 180);
  ctx.strokeStyle = '#7df9e8';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 6]);
  ctx.strokeRect(-pw / 2 - 4, -ph / 2 - 4, pw + 8, ph + 8);
  ctx.restore();
}

/** Rebuilds the panels for the current layout and favors faces in wide panels. */
function relayout() {
  resetPanelsForLayout(state, photos.length);
  const size = EXPORT_SIZES.find((s) => s.id === state.size) || EXPORT_SIZES[0];
  favorTopCrops(state, photos, size.w, size.h);
}

/** Pushes the pre-change snapshot, then runs the mutation and redraws. */
function change(mutator) {
  undoStack.push(snapshotState(state));
  mutator();
  syncControls();
  redraw();
}

function undo() {
  const json = undoStack.undo(snapshotState(state));
  if (!json) return;
  state = restoreState(json);
  syncControls();
  redraw();
  status('Undid that change.');
}

function redo() {
  const json = undoStack.redo(snapshotState(state));
  if (!json) return;
  state = restoreState(json);
  syncControls();
  redraw();
  status('Redid that change.');
}

/** Renders one cover at export size and resolves to its PNG blob. */
export function exportCover(sizeId) {
  const size = EXPORT_SIZES.find((s) => s.id === sizeId) || EXPORT_SIZES[0];
  const canvas = document.createElement('canvas');
  canvas.width = size.w; canvas.height = size.h;
  renderCover(canvas.getContext('2d'), size.w, size.h, state, photos);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve({ blob, size }), 'image/png');
  });
}

/** Downloads a blob as a file. */
function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

async function exportOne(sizeId) {
  const { blob, size } = await exportCover(sizeId);
  downloadBlob(blob, `neon-bay-cover-${size.w}x${size.h}.png`);
  status(`Saved neon-bay-cover-${size.w}x${size.h}.png`);
}

async function exportAll() {
  for (const size of EXPORT_SIZES) {
    const { blob } = await exportCover(size.id);
    downloadBlob(blob, `neon-bay-cover-${size.w}x${size.h}.png`);
    await new Promise((r) => setTimeout(r, 250));
  }
  status('Saved all three sizes: 1080 x 1080, 1080 x 1350 and 1920 x 1080.');
}

// ---- controls ------------------------------------------------------------

/** Builds the layout, grade and caption-style pickers from the cover module. */
function buildPickers() {
  const layoutBox = $('layouts');
  for (const layout of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.dataset.layout = layout.id;
    b.textContent = layout.label;
    b.title = layout.hint;
    b.addEventListener('click', () => change(() => {
      state.layout = layout.id;
      relayout();
    }));
    layoutBox.appendChild(b);
  }
  const gradeSelect = $('grade');
  for (const grade of GRADES) {
    const o = document.createElement('option');
    o.value = grade.id; o.textContent = `${grade.label} — ${grade.hint}`;
    gradeSelect.appendChild(o);
  }
  const styleSelect = $('captionStyle');
  for (const style of CAPTION_STYLES) {
    const o = document.createElement('option');
    o.value = style.id; o.textContent = style.label;
    styleSelect.appendChild(o);
  }
  const sizeBox = $('sizeTabs');
  for (const size of EXPORT_SIZES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.dataset.size = size.id;
    b.textContent = size.label;
    b.addEventListener('click', () => change(() => { state.size = size.id; }));
    sizeBox.appendChild(b);
  }
}

/** Renders the photo strip; clicking a photo assigns it to the selected panel. */
function buildPhotoStrip() {
  const strip = $('photoStrip');
  strip.innerHTML = '';
  photos.forEach((photo, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = `${photo.name} — click to put it in the selected panel`;
    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = photo.name;
    b.appendChild(img);
    const tag = document.createElement('span');
    tag.textContent = photo.name;
    b.appendChild(tag);
    b.addEventListener('click', () => change(() => {
      state.fillAll = -1;
      const panel = state.panels[state.selected] || defaultPanel(i);
      state.panels[state.selected] = { ...panel, photo: i };
    }));
    strip.appendChild(b);
  });
  // The "one photo fills all" picker lists the same photos.
  const fillAll = $('fillAll');
  fillAll.innerHTML = '<option value="-1">Mixed — a photo per panel</option>';
  photos.forEach((photo, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = photo.name;
    fillAll.appendChild(o);
  });
  fillAll.value = String(state.fillAll);
}

/** Reflects the state into every control (after undo/redo or a shot scene). */
function syncControls() {
  document.querySelectorAll('#layouts .pick').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('#sizeTabs .pick').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.size);
  });
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('captionStyle').value = state.captionStyle;
  $('grade').value = state.grade;
  $('grain').checked = state.grain;
  $('vignette').checked = state.vignette;
  $('frame').checked = state.frame;
  $('badge').checked = state.badge;
  $('stars').value = String(state.stars);
  $('starsOut').textContent = state.stars ? `${state.stars} / 5` : 'off';
  $('fillAll').value = String(state.fillAll);
  $('undoBtn').disabled = !undoStack.canUndo;
  $('redoBtn').disabled = !undoStack.canRedo;
  updatePanelControls();
}

/** Reflects the selected panel's crop into its sliders. */
function updatePanelControls() {
  const panel = state.panels[state.selected];
  const n = state.panels.length;
  $('selectedLabel').textContent = panel
    ? `Panel ${state.selected + 1} of ${n}`
    : 'No panel';
  if (!panel) return;
  $('zoom').value = String(panel.zoom);
  $('panX').value = String(panel.panX);
  $('panY').value = String(panel.panY);
  $('rot').value = String(panel.rot);
  $('panelPhoto').value = String(panel.photo);
  $('zoomOut').textContent = `${panel.zoom.toFixed(2)}x`;
  $('panXOut').textContent = `${Math.round(panel.panX * 100)}%`;
  $('panYOut').textContent = `${Math.round(panel.panY * 100)}%`;
  $('rotOut').textContent = `${Math.round(panel.rot)}°`;
}

/** Fills the per-panel photo picker from the loaded photos. */
function buildPanelPhotoOptions() {
  const select = $('panelPhoto');
  select.innerHTML = '';
  photos.forEach((photo, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = photo.name;
    select.appendChild(o);
  });
}

/** Clicking the preview selects the panel under the pointer. */
function bindPreviewClick() {
  preview.addEventListener('click', (e) => {
    const rect = preview.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const geo = layoutGeometry(state.layout, preview.width, preview.height);
    // Hit-test from the top panel down so overlaps pick the visible one.
    for (let i = geo.panels.length - 1; i >= 0; i--) {
      const p = geo.panels[i];
      if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) {
        change(() => { state.selected = i; });
        status(`Selected panel ${i + 1} of ${geo.panels.length}.`);
        return;
      }
    }
  });
}

function bindControls() {
  // For free-form edits (typing, dragging a slider) the undo snapshot is taken
  // on the first input event of the edit, before that event's mutation, so
  // undo restores the state the edit started from.
  const editSession = (mutate) => {
    let editing = false;
    return {
      input: (e) => {
        if (!editing) { undoStack.push(snapshotState(state)); editing = true; }
        mutate(e);
      },
      end: () => { editing = false; },
    };
  };
  const titleEdit = editSession((e) => {
    state.title = e.target.value;
    redraw();
  });
  $('title').addEventListener('input', titleEdit.input);
  $('title').addEventListener('change', titleEdit.end);
  $('title').addEventListener('blur', titleEdit.end);
  const subtitleEdit = editSession((e) => {
    state.subtitle = e.target.value;
    redraw();
  });
  $('subtitle').addEventListener('input', subtitleEdit.input);
  $('subtitle').addEventListener('change', subtitleEdit.end);
  $('subtitle').addEventListener('blur', subtitleEdit.end);
  $('captionStyle').addEventListener('change', (e) => change(() => {
    state.captionStyle = e.target.value;
  }));
  $('grade').addEventListener('change', (e) => change(() => {
    state.grade = e.target.value;
  }));
  $('grain').addEventListener('change', (e) => change(() => { state.grain = e.target.checked; }));
  $('vignette').addEventListener('change', (e) => change(() => { state.vignette = e.target.checked; }));
  $('frame').addEventListener('change', (e) => change(() => { state.frame = e.target.checked; }));
  $('badge').addEventListener('change', (e) => change(() => { state.badge = e.target.checked; }));
  const starsEdit = editSession((e) => {
    state.stars = Number(e.target.value);
    $('starsOut').textContent = state.stars ? `${state.stars} / 5` : 'off';
    redraw();
  });
  $('stars').addEventListener('input', starsEdit.input);
  $('stars').addEventListener('change', () => { starsEdit.end(); syncControls(); });
  $('stars').addEventListener('blur', starsEdit.end);
  $('fillAll').addEventListener('change', (e) => change(() => {
    const v = Number(e.target.value);
    if (v >= 0) fillAllPanels(state, v);
    else unfillAllPanels(state, photos.length);
  }));
  $('panelPhoto').addEventListener('change', (e) => change(() => {
    state.fillAll = -1;
    const panel = state.panels[state.selected] || defaultPanel(Number(e.target.value));
    state.panels[state.selected] = { ...panel, photo: Number(e.target.value) };
  }));
  const slider = (id, key) => {
    const session = editSession((e) => {
      const panel = state.panels[state.selected];
      if (!panel) return;
      panel[key] = Number(e.target.value);
      redraw();
    });
    $(id).addEventListener('input', session.input);
    $(id).addEventListener('change', () => { session.end(); updatePanelControls(); });
    $(id).addEventListener('blur', session.end);
  };
  slider('zoom', 'zoom');
  slider('panX', 'panX');
  slider('panY', 'panY');
  slider('rot', 'rot');
  $('undoBtn').addEventListener('click', undo);
  $('redoBtn').addEventListener('click', redo);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault(); undo();
    } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y'
      || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
      e.preventDefault(); redo();
    }
  });
  $('exportAll').addEventListener('click', exportAll);
  $('exportSquare').addEventListener('click', () => exportOne('1080x1080'));
  $('exportPortrait').addEventListener('click', () => exportOne('1080x1350'));
  $('exportLandscape').addEventListener('click', () => exportOne('1920x1080'));
  $('photoFile').addEventListener('change', async (e) => {
    const files = [...e.target.files].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    for (const file of files) {
      try {
        const photo = await loadUserPhoto(file, userPhotoCount++);
        photos.push(photo);
        change(() => {
          relayout();
        });
        buildPhotoStrip();
        buildPanelPhotoOptions();
        status(`Loaded ${file.name} — click a thumbnail to place it, or use “One photo fills all”.`);
      } catch {
        status(`Could not read ${file.name}.`);
      }
    }
    e.target.value = '';
  });
  $('useSamples').addEventListener('click', () => {
    change(() => {
      state.fillAll = -1;
      relayout();
    });
    status('Sample photos placed across the panels.');
  });
}

// ---- boot ------------------------------------------------------------------

buildPickers();
bindControls();
bindPreviewClick();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    loadSamples: loadSamplePhotos,
    loadImage,
    applyScene: async (scene) => {
      photos = scene.photos;
      state = scene.state;
      undoStack = new UndoStack();
      relayout();
      buildPhotoStrip();
      buildPanelPhotoOptions();
      syncControls();
      try {
        await Promise.all([
          document.fonts.load('40px Anton'),
          document.fonts.load('40px Pacifico'),
        ]);
      } catch {
        // The system fallback still draws; the shipped fonts are preferred.
      }
      await document.fonts.ready;
      redraw();
    },
    exportCover,
    setExportDataUrl: (dataUrl) => { window.__exportPng = dataUrl; },
    markReady: () => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        window.__shotReady = true;
      }));
    },
  });
} else {
  (async () => {
    photos = await loadSamplePhotos();
    relayout();
    buildPhotoStrip();
    buildPanelPhotoOptions();
    syncControls();
    try {
      await Promise.all([
        document.fonts.load('40px Anton'),
        document.fonts.load('40px Pacifico'),
      ]);
    } catch {
      // The system fallback still draws; the shipped fonts are preferred.
    }
    redraw();
    document.fonts.ready.then(redraw);
  })();
}
