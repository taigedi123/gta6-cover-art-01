// Neon Bay Cover Studio — the editor state.
// The state is plain JSON (so undo/redo is a stack of snapshots) except for the
// loaded photos, which live beside it as image elements keyed by id.

import { layoutGeometry, panelCount } from './cover.js';

/** The state a fresh cover starts from. */
export function defaultState() {
  return {
    layout: 'grid9',
    size: '1080x1080',
    title: 'Neon Bay Nights',
    subtitle: 'golden hour in the bay',
    captionStyle: 'sunset',
    grade: 'sunset',
    grain: true,
    vignette: true,
    frame: true,
    badge: true,
    stars: 4,
    fillAll: -1, // photo index filling every panel, or -1 for mixed panels
    panels: [],
    selected: 0,
  };
}

/** One panel's crop: which photo, zoom, pan and rotation. */
export function defaultPanel(photoIndex) {
  return { photo: photoIndex, zoom: 1, panX: 0, panY: 0, rot: 0 };
}

/**
 * Rebuilds the panel list for the state's layout, keeping each panel's crop
 * where a panel of the same index exists and dealing photos round-robin
 * across the panels otherwise.
 */
export function resetPanelsForLayout(state, photoCount) {
  const n = panelCount(state.layout);
  const old = state.panels || [];
  const next = [];
  for (let i = 0; i < n; i++) {
    if (old[i]) {
      next.push({ ...old[i] });
    } else if (state.fillAll >= 0) {
      next.push(defaultPanel(state.fillAll));
    } else {
      next.push(defaultPanel(photoCount ? i % photoCount : 0));
    }
  }
  state.panels = next;
  if (state.selected >= n) state.selected = 0;
}

/** Fills every panel with one photo. */
export function fillAllPanels(state, photoIndex) {
  state.fillAll = photoIndex;
  state.panels = state.panels.map(() => defaultPanel(photoIndex));
}

/**
 * Nudges each untouched panel's crop toward the top of a portrait photo when
 * the panel is wider than tall, so faces stay in frame instead of being
 * cropped out by the cover fit. Only panels the user has not panned yet move.
 */
export function favorTopCrops(state, photos, w, h) {
  const geo = layoutGeometry(state.layout, w, h);
  geo.panels.forEach((panel, i) => {
    const p = state.panels[i];
    const photo = photos[p ? p.photo : 0];
    if (!p || !photo || !photo.img) return;
    const panelIsWide = panel.w * w > panel.h * h;
    const photoIsTall = photo.img.naturalHeight > photo.img.naturalWidth;
    if (panelIsWide && photoIsTall && p.panY === 0) p.panY = 0.6;
  });
}

/** Lets panels hold different photos again. */
export function unfillAllPanels(state, photoCount) {
  state.fillAll = -1;
  state.panels = state.panels.map((p, i) => ({ ...p, photo: photoCount ? i % photoCount : 0 }));
}

/** The JSON snapshot of the state (photos excluded). */
export function snapshotState(state) {
  return JSON.stringify(state);
}

/** Restores a state from a JSON snapshot. */
export function restoreState(json) {
  const state = JSON.parse(json);
  if (!Array.isArray(state.panels)) state.panels = [];
  return state;
}

/** A small undo/redo stack over JSON snapshots. */
export class UndoStack {
  constructor(limit = 60) {
    this.limit = limit;
    this.past = [];
    this.future = [];
  }

  /** Records the state before a change; call before mutating. */
  push(json) {
    if (this.past.length && this.past[this.past.length - 1] === json) return;
    this.past.push(json);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }

  undo(currentJson) {
    if (!this.past.length) return null;
    this.future.push(currentJson);
    return this.past.pop();
  }

  redo(currentJson) {
    if (!this.future.length) return null;
    this.past.push(currentJson);
    return this.future.pop();
  }

  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** Loads a local file picked by the user into a photo record. */
export function loadUserPhoto(file, index) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ id: `user-${index}`, name: file.name, img, url });
    img.onerror = () => reject(new Error(`could not read ${file.name}`));
    img.src = url;
  });
}

/** The two sample photos shipped with the app, free to use. */
export async function loadSamplePhotos() {
  const defs = [
    { id: 'sample-boulevard', name: 'Boulevard', url: 'samples/boulevard.jpg' },
    { id: 'sample-pier', name: 'Pier', url: 'samples/pier.jpg' },
  ];
  const photos = [];
  for (const def of defs) {
    try {
      const img = await loadImage(def.url);
      photos.push({ id: def.id, name: def.name, img, url: def.url });
    } catch {
      // A missing sample leaves the other one standing.
    }
  }
  return photos;
}
