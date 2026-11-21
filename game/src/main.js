// Lantern Row: the game itself. A state machine (title, play, pause,
// clear, victory, over) over three scenes, each a pair of pictures drawn
// by scenes.js; the left picture is the original, the right one hides
// seven differences. Clicking (or the keyboard crosshair) checks a point
// against the scene's difference zones.

import { VIEW_W, VIEW_H, PANEL, CHROME, SCENES, TIME_PER_SCENE, POINTS_FOUND, POINTS_WRONG, POINTS_HINT, TIME_BONUS_FOUND, TIME_PENALTY_WRONG, HINTS_PER_SCENE } from './config.js';
import { SCENES as PAINT_SCENES, paintPanel } from './scenes.js';
import { Sfx } from './audio.js';
import { drawTopBar, drawBottomBar, drawTitle, drawSceneClear, drawVictory, drawGameOver, drawPaused } from './hud.js';
import { attachInput, panelAt, panelFractions } from './input.js';
import { stageShot, SHOT_TIME } from './shots.js';

const EMPTY = new Set();
const ALL = (scene) => new Set(scene.diffs.map((d) => d.id));

function freshState() {
  return {
    screen: 'title',
    sceneIndex: 0,
    scene: PAINT_SCENES[0],
    found: new Set(),
    cleared: [false, false, false],
    score: 0,
    best: 0,
    totalFound: 0,
    timeLeft: TIME_PER_SCENE,
    hintsLeft: HINTS_PER_SCENE,
    muted: false,
    message: 'Click a difference — or press Enter to begin.',
    messageTone: '',
    hintPulse: null,
    wrongMarks: [],
    foundAnim: null,
    crosshair: { x: 320, y: 360, visible: false },
  };
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sfx = new Sfx();
    this.state = freshState();
    this.shotMode = false;
    this.lastT = 0;
    try {
      this.state.best = Number(window.localStorage.getItem('lantern-row-best') || 0) || 0;
    } catch (err) {
      this.state.best = 0;
    }
    attachInput(canvas, this);
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (shot) stageShot(this, shot);
    this.loop = this.loop.bind(this);
    window.requestAnimationFrame(this.loop);
  }

  saveBest() {
    if (this.state.score > this.state.best) {
      this.state.best = this.state.score;
      try {
        window.localStorage.setItem('lantern-row-best', String(this.state.best));
      } catch (err) {
        // Storage may be unavailable; the best score is a nicety, not a need.
      }
    }
  }

  loadScene(index) {
    const state = this.state;
    state.sceneIndex = index;
    state.scene = PAINT_SCENES[index];
    state.found = new Set();
    state.timeLeft = TIME_PER_SCENE;
    state.hintsLeft = HINTS_PER_SCENE;
    state.hintPulse = null;
    state.wrongMarks = [];
    state.foundAnim = null;
    state.message = 'Find all 7 differences in ' + SCENES[index].name + '.';
    state.messageTone = '';
  }

  toTitle() {
    this.state = freshState();
    this.state.muted = this.sfx.muted;
    try {
      this.state.best = Number(window.localStorage.getItem('lantern-row-best') || 0) || 0;
    } catch (err) {
      this.state.best = 0;
    }
  }

  startGame() {
    const best = this.state.best;
    const muted = this.sfx.muted;
    this.state = freshState();
    this.state.best = best;
    this.state.muted = muted;
    this.state.screen = 'play';
    this.loadScene(0);
    this.state.message = 'Find all 7 differences before time runs out!';
  }

  restart() {
    this.startGame();
  }

  switchScene(index) {
    if (index === this.state.sceneIndex || this.state.screen !== 'play') return;
    this.state.cleared[this.state.sceneIndex] = false;
    this.loadScene(index);
    this.state.screen = 'play';
    this.sfx.click();
  }

  nextScene() {
    const next = this.state.sceneIndex + 1;
    if (next >= PAINT_SCENES.length) {
      this.state.screen = 'victory';
      return;
    }
    this.loadScene(next);
    this.state.screen = 'play';
  }

  togglePause() {
    if (this.state.screen === 'play') this.state.screen = 'pause';
    else if (this.state.screen === 'pause') this.state.screen = 'play';
    this.sfx.click();
  }

  toggleSound() {
    this.sfx.muted = !this.sfx.muted;
    this.state.muted = this.sfx.muted;
    this.state.message = this.sfx.muted ? 'Sound off.' : 'Sound on.';
    this.state.messageTone = '';
    if (!this.sfx.muted) this.sfx.click();
  }

  useHint() {
    const state = this.state;
    if (state.screen !== 'play' || state.hintsLeft <= 0) return;
    const rest = state.scene.diffs.filter((d) => !state.found.has(d.id));
    if (rest.length === 0) return;
    const pick = rest[0];
    state.hintsLeft -= 1;
    state.score = Math.max(0, state.score + POINTS_HINT);
    state.hintPulse = { id: pick.id, until: 2.2 };
    state.message = 'Hint: look near the ' + pick.name + ' (−50 points).';
    state.messageTone = '';
    this.sfx.hint();
  }

  moveCrosshair(x, y) {
    const c = this.state.crosshair;
    c.x = Math.max(0, Math.min(VIEW_W, x));
    c.y = Math.max(0, Math.min(VIEW_H, y));
    c.visible = true;
  }

  nudgeCrosshair(dx, dy) {
    const c = this.state.crosshair;
    c.visible = true;
    c.x = Math.max(0, Math.min(VIEW_W, c.x + dx));
    c.y = Math.max(0, Math.min(VIEW_H, c.y + dy));
  }

  clickCrosshair() {
    const c = this.state.crosshair;
    if (!c.visible) {
      c.visible = true;
      c.x = PANEL.xLeft + PANEL.w / 2;
      c.y = PANEL.y + PANEL.h / 2;
      return;
    }
    this.clickAt(c.x, c.y);
  }

  clickAt(x, y) {
    const state = this.state;
    if (state.screen !== 'play') return;
    const panel = panelAt(x, y);
    if (panel < 0) return;
    const f = panelFractions(x, y, panel);
    const px = f.fx * PANEL.w;
    const py = f.fy * PANEL.h;
    let hit = null;
    let hitDist = Infinity;
    for (const d of state.scene.diffs) {
      if (state.found.has(d.id)) continue;
      const dx = px - d.x * PANEL.w;
      const dy = py - d.y * PANEL.h;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= d.r + 14 && dist < hitDist) {
        hit = d;
        hitDist = dist;
      }
    }
    if (hit) {
      state.found.add(hit.id);
      state.totalFound += 1;
      state.score += POINTS_FOUND;
      state.timeLeft = Math.min(TIME_PER_SCENE, state.timeLeft + TIME_BONUS_FOUND);
      state.foundAnim = { id: hit.id, t: 0 };
      state.message = 'Found: ' + hit.name + '! +100 points, +5 seconds.';
      state.messageTone = 'good';
      this.sfx.found();
      if (state.found.size === state.scene.diffs.length) {
        state.cleared[state.sceneIndex] = true;
        this.saveBest();
        this.sfx.win();
        if (state.sceneIndex === PAINT_SCENES.length - 1) {
          state.screen = 'victory';
          state.message = 'Every difference found!';
        } else {
          state.screen = 'clear';
        }
      }
      return;
    }
    state.wrongMarks.push({ x, y, t: 0 });
    state.score = Math.max(0, state.score + POINTS_WRONG);
    state.timeLeft -= TIME_PENALTY_WRONG;
    state.message = 'Not a difference — −25 points, −5 seconds.';
    state.messageTone = 'bad';
    this.sfx.wrong();
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.screen = 'over';
      this.saveBest();
      this.sfx.lose();
    }
  }

  update(dt) {
    const state = this.state;
    if (this.shotMode) return;
    if (state.screen === 'play') {
      state.timeLeft -= dt;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        state.screen = 'over';
        this.saveBest();
        this.sfx.lose();
      }
    }
    if (state.hintPulse) {
      state.hintPulse.until -= dt;
      if (state.hintPulse.until <= 0) state.hintPulse = null;
    }
    state.wrongMarks = state.wrongMarks.filter((m) => {
      m.t += dt;
      return m.t < 0.9;
    });
    if (state.foundAnim) {
      state.foundAnim.t += dt;
      if (state.foundAnim.t > 0.7) state.foundAnim = null;
    }
  }

  drawPanels(t) {
    const ctx = this.ctx;
    const state = this.state;
    const panels = [
      { x: PANEL.xLeft, on: EMPTY, tag: 'A' },
      { x: PANEL.xRight, on: ALL(state.scene), tag: 'B' },
    ];
    panels.forEach((p) => {
      ctx.save();
      ctx.translate(p.x, PANEL.y);
      paintPanel(ctx, state.sceneIndex, p.on, t);
      ctx.restore();
      ctx.strokeStyle = CHROME.panelLine;
      ctx.lineWidth = 3;
      ctx.strokeRect(p.x, PANEL.y, PANEL.w, PANEL.h);
      ctx.fillStyle = CHROME.bar;
      ctx.beginPath();
      ctx.arc(p.x + 22, PANEL.y + 22, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = CHROME.barLine;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = CHROME.gold;
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.tag, p.x + 22, PANEL.y + 23);
    });
  }

  drawMarkers(t) {
    const ctx = this.ctx;
    const state = this.state;
    const xs = [PANEL.xLeft, PANEL.xRight];
    state.scene.diffs.forEach((d, i) => {
      if (!state.found.has(d.id)) return;
      xs.forEach((px) => {
        const cx = px + d.x * PANEL.w;
        const cy = PANEL.y + d.y * PANEL.h;
        ctx.strokeStyle = '#ffd94a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, d.r + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, d.r + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffd94a';
        ctx.beginPath();
        ctx.arc(cx, cy - d.r - 12, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#241b3d';
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), cx, cy - d.r - 11);
      });
    });
    if (state.hintPulse) {
      const d = state.scene.diffs.find((x) => x.id === state.hintPulse.id);
      if (d) {
        const pulse = 1 + 0.18 * Math.sin(t * 9);
        xs.forEach((px) => {
          const cx = px + d.x * PANEL.w;
          const cy = PANEL.y + d.y * PANEL.h;
          ctx.strokeStyle = 'rgba(126, 226, 160, 0.95)';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.arc(cx, cy, (d.r + 8) * pulse, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        });
      }
    }
    if (state.foundAnim) {
      const d = state.scene.diffs.find((x) => x.id === state.foundAnim.id);
      if (d) {
        const a = 1 - state.foundAnim.t / 0.7;
        xs.forEach((px) => {
          const cx = px + d.x * PANEL.w;
          const cy = PANEL.y + d.y * PANEL.h;
          ctx.strokeStyle = 'rgba(255, 217, 74,' + a.toFixed(2) + ')';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(cx, cy, d.r + 6 + state.foundAnim.t * 46, 0, Math.PI * 2);
          ctx.stroke();
        });
      }
    }
    state.wrongMarks.forEach((m) => {
      const a = 1 - m.t / 0.9;
      ctx.strokeStyle = 'rgba(228, 87, 75,' + a.toFixed(2) + ')';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x - 12, m.y - 12);
      ctx.lineTo(m.x + 12, m.y + 12);
      ctx.moveTo(m.x + 12, m.y - 12);
      ctx.lineTo(m.x - 12, m.y + 12);
      ctx.stroke();
    });
    if (state.crosshair.visible && state.screen === 'play') {
      const c = state.crosshair;
      ctx.strokeStyle = 'rgba(245, 237, 216, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(c.x - 19, c.y);
      ctx.lineTo(c.x - 8, c.y);
      ctx.moveTo(c.x + 8, c.y);
      ctx.lineTo(c.x + 19, c.y);
      ctx.moveTo(c.x, c.y - 19);
      ctx.lineTo(c.x, c.y - 8);
      ctx.moveTo(c.x, c.y + 8);
      ctx.lineTo(c.x, c.y + 19);
      ctx.stroke();
    }
  }

  render(t) {
    const ctx = this.ctx;
    const state = this.state;
    ctx.fillStyle = CHROME.bg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.drawPanels(t);
    this.drawMarkers(t);
    drawTopBar(ctx, state);
    drawBottomBar(ctx, state);
    if (state.screen === 'title') drawTitle(ctx, state);
    else if (state.screen === 'clear') drawSceneClear(ctx, state);
    else if (state.screen === 'victory') drawVictory(ctx, state);
    else if (state.screen === 'over') drawGameOver(ctx, state);
    else if (state.screen === 'pause') drawPaused(ctx, state);
    const status = document.getElementById('status');
    if (status) {
      status.textContent = 'Lantern Row, ' + SCENES[state.sceneIndex].name + ': found ' + state.found.size + ' of ' + state.scene.diffs.length + ' differences, ' + Math.ceil(state.timeLeft) + ' seconds left, score ' + state.score + '.';
    }
  }

  loop(now) {
    const t = this.shotMode ? SHOT_TIME : now / 1000;
    const dt = this.shotMode ? 0 : Math.min(0.1, (now - this.lastT) / 1000 || 0);
    this.lastT = now;
    this.update(dt);
    this.render(t);
    window.requestAnimationFrame(this.loop);
  }
}

const canvas = document.getElementById('game');
new Game(canvas);
