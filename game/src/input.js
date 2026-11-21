// Pointer and keyboard input, translated into game actions.
// The canvas is a fixed 1280x720 stage scaled by CSS, so every client
// coordinate is mapped back through the canvas bounding box first. Clicks
// are tested against buttons, then scene tabs, then the two pictures.

import { VIEW_W, VIEW_H, PANEL } from './config.js';
import { layout } from './hud.js';

function inRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

// Which panel (0 left, 1 right) holds the point, or -1 outside both.
export function panelAt(x, y) {
  if (y < PANEL.y || y > PANEL.y + PANEL.h) return -1;
  if (x >= PANEL.xLeft && x <= PANEL.xLeft + PANEL.w) return 0;
  if (x >= PANEL.xRight && x <= PANEL.xRight + PANEL.w) return 1;
  return -1;
}

// Panel-local fractions (0..1) of a stage point inside a panel.
export function panelFractions(x, y, panel) {
  const px = panel === 0 ? PANEL.xLeft : PANEL.xRight;
  return { fx: (x - px) / PANEL.w, fy: (y - PANEL.y) / PANEL.h };
}

export function attachInput(canvas, game) {
  function toStage(ev) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((ev.clientX - rect.left) / rect.width) * VIEW_W,
      y: ((ev.clientY - rect.top) / rect.height) * VIEW_H,
    };
  }

  canvas.addEventListener('pointermove', (ev) => {
    const p = toStage(ev);
    game.moveCrosshair(p.x, p.y);
  });

  canvas.addEventListener('pointerdown', (ev) => {
    const p = toStage(ev);
    game.sfx.unlock();
    const L = layout(game.state);
    if (game.state.screen === 'title') {
      if (inRect(p.x, p.y, L.startBtn)) game.startGame();
      return;
    }
    if (game.state.screen === 'clear') {
      if (inRect(p.x, p.y, L.nextBtn)) game.nextScene();
      return;
    }
    if (game.state.screen === 'victory' || game.state.screen === 'over') {
      if (inRect(p.x, p.y, L.againBtn)) game.restart();
      return;
    }
    if (game.state.screen === 'pause') {
      if (inRect(p.x, p.y, L.pause)) game.togglePause();
      return;
    }
    if (game.state.screen !== 'play') return;
    if (inRect(p.x, p.y, L.hint)) { game.useHint(); return; }
    if (inRect(p.x, p.y, L.pause)) { game.togglePause(); return; }
    if (inRect(p.x, p.y, L.sound)) { game.toggleSound(); return; }
    for (const tab of L.tabs) {
      if (inRect(p.x, p.y, tab)) { game.switchScene(tab.index); return; }
    }
    game.clickAt(p.x, p.y);
  });

  window.addEventListener('keydown', (ev) => {
    const k = ev.key;
    if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown' || k === ' ') {
      ev.preventDefault();
    }
    game.sfx.unlock();
    if (k === 'm' || k === 'M') { game.toggleSound(); return; }
    const s = game.state.screen;
    if (s === 'title' && (k === 'Enter' || k === ' ')) { game.startGame(); return; }
    if (s === 'clear' && (k === 'n' || k === 'N' || k === 'Enter')) { game.nextScene(); return; }
    if ((s === 'victory' || s === 'over') && (k === 'r' || k === 'R' || k === 'Enter')) { game.restart(); return; }
    if (s === 'pause' && (k === 'p' || k === 'P' || k === 'Escape')) { game.togglePause(); return; }
    if (s !== 'play') return;
    if (k === 'p' || k === 'P' || k === 'Escape') { game.togglePause(); return; }
    if (k === 'h' || k === 'H') { game.useHint(); return; }
    if (k === '1' || k === '2' || k === '3') { game.switchScene(Number(k) - 1); return; }
    const step = ev.shiftKey ? 60 : 18;
    if (k === 'ArrowLeft') game.nudgeCrosshair(-step, 0);
    else if (k === 'ArrowRight') game.nudgeCrosshair(step, 0);
    else if (k === 'ArrowUp') game.nudgeCrosshair(0, -step);
    else if (k === 'ArrowDown') game.nudgeCrosshair(0, step);
    else if (k === 'Enter' || k === ' ') game.clickCrosshair();
  });
}
