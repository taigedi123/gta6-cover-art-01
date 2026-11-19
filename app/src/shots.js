// Fixed scenes for screenshots: ?shot=editor shows the editor with sample photos
// loaded; ?shot=cover draws one exported cover full-screen in the page;
// ?shot=export renders a real export at full size and exposes its PNG bytes as
// window.__exportPng, so the shot script can save exactly what the app wrote.
// Every scene sets window.__shotReady once painted.
import { defaultState, resetPanelsForLayout } from './state.js';

// Scene presets: layout, caption, grade and size for each shot.
const SCENES = {
  editor: {
    layout: 'hero3', size: '1080x1080', title: 'Boulevard Queen',
    subtitle: 'queen of the boulevard', captionStyle: 'sunset', grade: 'sunset',
    stars: 4, coverOnly: false, selected: 0,
  },
  cover: {
    layout: 'tilted', size: '1920x1080', title: 'Neon Bay Nights',
    subtitle: 'golden hour in the bay', captionStyle: 'halftone', grade: 'neon',
    stars: 5, coverOnly: true, selected: 0,
  },
  'cover-portrait': {
    layout: 'grid9', size: '1080x1350', title: 'Golden Hour',
    subtitle: 'down at the pier', captionStyle: 'sunset', grade: 'sunset',
    stars: 4, coverOnly: true, selected: 0,
  },
  'cover-square': {
    layout: 'hero3', size: '1080x1080', title: 'Sunset Run',
    subtitle: 'top down, sun out', captionStyle: 'white', grade: 'gold',
    stars: 4, coverOnly: true, selected: 0,
  },
};

/** Builds a scene state from a preset, with query params overriding it. */
function sceneState(preset, query) {
  const state = defaultState();
  Object.assign(state, preset);
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('caption')) state.title = query.get('caption');
  if (query.get('subtitle')) state.subtitle = query.get('subtitle');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('style')) state.captionStyle = query.get('style');
  if (query.get('size')) state.size = query.get('size');
  if (query.get('stars')) state.stars = Number(query.get('stars'));
  state.fillAll = -1;
  return state;
}

/** The scene preset for an export of a given size. */
function presetForExportSize(sizeId) {
  if (sizeId === '1080x1350') return 'cover-portrait';
  if (sizeId === '1080x1080') return 'cover-square';
  return 'cover';
}

export async function runShot(shot, query, hooks) {
  const isExport = shot === 'export';
  const preset = SCENES[isExport ? presetForExportSize(query.get('size')) : shot] || SCENES.editor;
  const state = sceneState(preset, query);
  if (preset.coverOnly || isExport) document.body.classList.add('shot-cover');
  const photos = await hooks.loadSamples();
  // Photos deal round-robin across the panels so a scene shows both samples.
  resetPanelsForLayout(state, photos.length);
  state.panels.forEach((panel, i) => { panel.photo = i % photos.length; });
  state.selected = preset.selected || 0;
  await hooks.applyScene({ state, photos });
  if (isExport) {
    // A real export through the app's own export path, at full size.
    const sizeId = query.get('size') || preset.size;
    const { blob } = await hooks.exportCover(sizeId);
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    hooks.setExportDataUrl(dataUrl);
  }
  hooks.markReady();
}
