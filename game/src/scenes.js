// The three scenes of Lantern Row, drawn procedurally on canvas.
// Each scene paints the same picture twice: the left panel with no
// differences applied, the right panel with all seven. A difference is a
// small branch in the painter (`on.has('id')`), never a second drawing, so
// the pictures stay identical everywhere else. Coordinates of a difference
// are fractions of the panel (600 x 540); hit-testing uses the same numbers.

import { makeRng, range } from './rng.js';

// ---- small drawing helpers -------------------------------------------------

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function sky(ctx, w, h, top, mid, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function stars(ctx, rng, w, h, count, t, yMax) {
  for (let i = 0; i < count; i += 1) {
    const x = rng() * w;
    const y = rng() * (yMax || h * 0.5);
    const s = 1 + rng() * 2.2;
    const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * 1.4 + i * 1.7));
    ctx.fillStyle = 'rgba(255, 244, 200,' + tw.toFixed(2) + ')';
    ctx.beginPath();
    ctx.moveTo(x, y - s * 2);
    ctx.lineTo(x + s * 0.6, y - s * 0.6);
    ctx.lineTo(x + s * 2, y);
    ctx.lineTo(x + s * 0.6, y + s * 0.6);
    ctx.lineTo(x, y + s * 2);
    ctx.lineTo(x - s * 0.6, y + s * 0.6);
    ctx.lineTo(x - s * 2, y);
    ctx.lineTo(x - s * 0.6, y - s * 0.6);
    ctx.closePath();
    ctx.fill();
  }
}

// A hanging paper lantern: round body, caps, tassel, warm glow when lit.
function paperLantern(ctx, x, y, s, body, lit, t) {
  if (lit) {
    const glow = ctx.createRadialGradient(x, y, s * 0.2, x, y, s * 1.9);
    glow.addColorStop(0, 'rgba(255, 190, 90, 0.5)');
    glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
    ctx.fillStyle = glow;
    circle(ctx, x, y, s * 1.9);
    ctx.fill();
  }
  ctx.strokeStyle = '#2a1a12';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.7);
  ctx.lineTo(x, y - s * 0.9);
  ctx.stroke();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(x, y, s, s * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60, 20, 10, 0.55)';
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.ellipse(x, y, s * (1 - Math.abs(i) * 0.18), s * 0.82, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#c8932e';
  ctx.fillRect(x - s * 0.34, y - s * 0.95, s * 0.68, s * 0.2);
  ctx.fillRect(x - s * 0.34, y + s * 0.75, s * 0.68, s * 0.2);
  ctx.strokeStyle = '#e8b64c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.95);
  ctx.lineTo(x, y + s * 1.45);
  ctx.stroke();
}

// A striped market awning.
function awning(ctx, x, y, w, h, c1, c2, stripes) {
  for (let i = 0; i < stripes; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? c1 : c2;
    const sx = x + (w / stripes) * i;
    ctx.fillRect(sx, y, w / stripes + 1, h);
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.fillRect(x, y + h - 8, w, 8);
}

// A small sitting cat, drawn as one silhouette with ears and a tail.
function cat(ctx, x, y, s, color, tailUp) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, s * 0.62, s * 0.5, 0, 0, Math.PI * 2); // body
  ctx.fill();
  circle(ctx, x + s * 0.28, y - s * 0.62, s * 0.36); // head
  ctx.fill();
  ctx.beginPath(); // ears
  ctx.moveTo(x + s * 0.05, y - s * 0.85);
  ctx.lineTo(x + s * 0.12, y - s * 1.15);
  ctx.lineTo(x + s * 0.32, y - s * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + s * 0.3, y - s * 0.88);
  ctx.lineTo(x + s * 0.45, y - s * 1.16);
  ctx.lineTo(x + s * 0.56, y - s * 0.88);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = color; // tail
  ctx.lineWidth = s * 0.16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.55, y + s * 0.25);
  if (tailUp) ctx.quadraticCurveTo(x - s * 1.05, y, x - s * 0.85, y - s * 0.7);
  else ctx.quadraticCurveTo(x - s * 1.0, y + s * 0.35, x - s * 0.7, y + s * 0.3);
  ctx.stroke();
}

// ---- scene 1: Lantern Market ----------------------------------------------

const MARKET_DIFFS = [
  { id: 'lantern', name: 'a missing lantern', x: 0.5, y: 0.24, r: 26 },
  { id: 'cat', name: 'the cat on the counter', x: 0.783, y: 0.644, r: 30 },
  { id: 'awning', name: 'the awning stripes', x: 0.25, y: 0.48, r: 30 },
  { id: 'sign', name: 'the fish on the sign', x: 0.15, y: 0.556, r: 26 },
  { id: 'crate', name: 'an extra crate', x: 0.877, y: 0.619, r: 26 },
  { id: 'moon', name: 'the shape of the moon', x: 0.833, y: 0.13, r: 36 },
  { id: 'star', name: 'a bright star', x: 0.7, y: 0.08, r: 18 },
];

function paintMarket(ctx, w, h, on, t) {
  const rng = makeRng(101);
  sky(ctx, w, h, '#191238', '#3a2360', '#6b3a6e');
  stars(ctx, rng, w, h, 42, t, 250);
  // One bright star near the moon: gone on the right panel.
  if (!on.has('star')) {
    ctx.fillStyle = 'rgba(255, 246, 210, 0.95)';
    ctx.beginPath();
    ctx.moveTo(420, 28);
    ctx.lineTo(424, 40);
    ctx.lineTo(436, 44);
    ctx.lineTo(424, 48);
    ctx.lineTo(420, 60);
    ctx.lineTo(416, 48);
    ctx.lineTo(404, 44);
    ctx.lineTo(416, 40);
    ctx.closePath();
    ctx.fill();
  }
  // The moon: full on the left, a crescent on the right.
  ctx.fillStyle = '#f7ead0';
  circle(ctx, 500, 70, 34);
  ctx.fill();
  ctx.fillStyle = 'rgba(247, 234, 208, 0.25)';
  circle(ctx, 500, 70, 44);
  ctx.fill();
  if (on.has('moon')) {
    ctx.fillStyle = '#2c1e52';
    circle(ctx, 514, 62, 30);
    ctx.fill();
  }
  // Distant rooftops.
  ctx.fillStyle = '#241a44';
  ctx.beginPath();
  ctx.moveTo(0, 330);
  ctx.lineTo(0, 290);
  ctx.lineTo(70, 290);
  ctx.lineTo(90, 268);
  ctx.lineTo(110, 290);
  ctx.lineTo(200, 290);
  ctx.lineTo(200, 330);
  ctx.lineTo(380, 330);
  ctx.lineTo(380, 296);
  ctx.lineTo(430, 262);
  ctx.lineTo(480, 296);
  ctx.lineTo(600, 296);
  ctx.lineTo(600, 330);
  ctx.closePath();
  ctx.fill();
  // Street.
  ctx.fillStyle = '#4a3550';
  ctx.fillRect(0, 400, w, 140);
  ctx.fillStyle = 'rgba(255, 220, 160, 0.08)';
  for (let i = 0; i < 26; i += 1) {
    ctx.fillRect(rng() * w, 410 + rng() * 120, 26 + rng() * 30, 10);
  }
  // Lantern string across the street.
  ctx.strokeStyle = '#1c1430';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 96);
  ctx.quadraticCurveTo(300, 116, 600, 96);
  ctx.stroke();
  const lanternXs = [70, 180, 300, 420, 530];
  const lanternCols = ['#e4574b', '#e4574b', '#e4574b', '#f2b544', '#e4574b'];
  lanternXs.forEach((lx, i) => {
    if (i === 2 && on.has('lantern')) return; // the missing lantern
    const ly = 96 + Math.sin((lx / 600) * Math.PI) * 18;
    paperLantern(ctx, lx, ly + 18, 17, lanternCols[i], true, t);
  });
  // Left stall: striped awning, counter, jars, round fish sign.
  ctx.fillStyle = '#5a3a28';
  ctx.fillRect(52, 300, 10, 110);
  ctx.fillRect(248, 300, 10, 110);
  awning(ctx, 40, 236, 230, 46, on.has('awning') ? '#3f9e6a' : '#e4574b', '#f5edd8', 8);
  ctx.fillStyle = '#7a4a2e';
  rr(ctx, 48, 330, 214, 74, 8);
  ctx.fill();
  ctx.fillStyle = '#8d5a38';
  ctx.fillRect(48, 330, 214, 12);
  for (let i = 0; i < 3; i += 1) {
    const jx = 78 + i * 62;
    ctx.fillStyle = ['#c96f4a', '#7fb069', '#e9c46a'][i];
    rr(ctx, jx, 296, 34, 36, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(jx + 6, 300, 6, 26);
  }
  // Round sign with a painted koi: it swims the other way on the right.
  ctx.fillStyle = '#f5edd8';
  circle(ctx, 90, 300, 26);
  ctx.fill();
  ctx.strokeStyle = '#8d5a38';
  ctx.lineWidth = 3;
  circle(ctx, 90, 300, 26);
  ctx.stroke();
  ctx.fillStyle = on.has('sign') ? '#3f7fb8' : '#e07840';
  ctx.beginPath();
  ctx.ellipse(90, 300, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  const dir = on.has('sign') ? -1 : 1;
  ctx.beginPath();
  ctx.moveTo(90 + dir * 14, 300);
  ctx.lineTo(90 + dir * 24, 293);
  ctx.lineTo(90 + dir * 24, 307);
  ctx.closePath();
  ctx.fill();
  // Right stall: teal awning, crates, and the cat on a crate.
  ctx.fillStyle = '#5a3a28';
  ctx.fillRect(342, 300, 10, 110);
  ctx.fillRect(548, 300, 10, 110);
  awning(ctx, 330, 236, 230, 46, '#3fb8a6', '#f5edd8', 8);
  ctx.fillStyle = '#7a4a2e';
  rr(ctx, 338, 330, 214, 74, 8);
  ctx.fill();
  ctx.fillStyle = '#8d5a38';
  ctx.fillRect(338, 330, 214, 12);
  ctx.fillStyle = '#a8763e';
  ctx.fillRect(360, 352, 60, 40);
  ctx.fillRect(428, 352, 60, 40);
  ctx.strokeStyle = '#6e4f22';
  ctx.lineWidth = 2;
  ctx.strokeRect(360, 352, 60, 40);
  ctx.strokeRect(428, 352, 60, 40);
  if (on.has('crate')) {
    ctx.fillStyle = '#a8763e';
    ctx.fillRect(500, 316, 52, 36);
    ctx.strokeRect(500, 316, 52, 36);
  }
  if (!on.has('cat')) cat(ctx, 470, 348, 26, '#2e2a33', true);
  // Warm light pooling under the stalls.
  const pool = ctx.createRadialGradient(300, 430, 20, 300, 430, 260);
  pool.addColorStop(0, 'rgba(255, 190, 90, 0.16)');
  pool.addColorStop(1, 'rgba(255, 190, 90, 0)');
  ctx.fillStyle = pool;
  ctx.fillRect(0, 380, w, 160);
}

// ---- scene 2: Koi Pond Garden ---------------------------------------------

const POND_DIFFS = [
  { id: 'koi', name: 'an extra koi', x: 0.62, y: 0.72, r: 26 },
  { id: 'flower', name: 'the lily flower', x: 0.78, y: 0.55, r: 22 },
  { id: 'plank', name: 'a bridge plank', x: 0.5, y: 0.4, r: 22 },
  { id: 'blossom', name: 'a cherry branch', x: 0.22, y: 0.178, r: 28 },
  { id: 'stone', name: 'a stepping stone', x: 0.2, y: 0.919, r: 24 },
  { id: 'lantern', name: 'the stone lantern light', x: 0.867, y: 0.661, r: 26 },
  { id: 'frog', name: 'a frog on a lily pad', x: 0.3, y: 0.68, r: 22 },
];

// One koi: an orange-white body, tail and fins, swimming at an angle.
function koi(ctx, x, y, s, angle, flip) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(flip ? -1 : 1, 1);
  ctx.fillStyle = '#f2f0e6';
  ctx.beginPath();
  ctx.ellipse(0, 0, s, s * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e07840';
  ctx.beginPath();
  ctx.ellipse(-s * 0.3, -s * 0.08, s * 0.42, s * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 0.42, s * 0.1, s * 0.26, s * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(224, 120, 64, 0.85)';
  ctx.beginPath();
  ctx.moveTo(-s * 0.9, 0);
  ctx.lineTo(-s * 1.5, -s * 0.42);
  ctx.lineTo(-s * 1.5, s * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1c1c22';
  circle(ctx, s * 0.62, -s * 0.12, s * 0.06);
  ctx.fill();
  circle(ctx, s * 0.62, s * 0.12, s * 0.06);
  ctx.fill();
  ctx.restore();
}

function lilyPad(ctx, x, y, s, flower) {
  ctx.fillStyle = '#3f8f4f';
  ctx.beginPath();
  ctx.ellipse(x, y, s, s * 0.55, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2f7038';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + s * 0.5, y - s * 0.42);
  ctx.lineTo(x + s * 0.5, y + s * 0.42);
  ctx.closePath();
  ctx.fill();
  if (flower) {
    ctx.fillStyle = flower;
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * 7, y - 6 + Math.sin(a) * 5, 7, 4, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f2b544';
    circle(ctx, x, y - 6, 4);
    ctx.fill();
  }
}

function paintPond(ctx, w, h, on, t) {
  const rng = makeRng(202);
  sky(ctx, w, h, '#2c2350', '#5d3a63', '#8a5a6b');
  stars(ctx, rng, w, h, 30, t, 180);
  // Low moon over the garden wall.
  ctx.fillStyle = '#f2e3c0';
  circle(ctx, 520, 62, 26);
  ctx.fill();
  // Garden wall and grass.
  ctx.fillStyle = '#3d3358';
  ctx.fillRect(0, 210, w, 26);
  ctx.fillStyle = '#4a7a45';
  ctx.fillRect(0, 236, w, 304);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  for (let i = 0; i < 40; i += 1) {
    ctx.fillRect(rng() * w, 250 + rng() * 280, 18 + rng() * 26, 5);
  }
  // Cherry tree on the left: trunk, branches, blossom puffs.
  ctx.strokeStyle = '#4a2e22';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(70, 330);
  ctx.quadraticCurveTo(60, 220, 92, 150);
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(84, 210);
  ctx.quadraticCurveTo(120, 170, 165, 150);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(80, 240);
  ctx.quadraticCurveTo(40, 200, 30, 160);
  ctx.stroke();
  const blossom = (bx, by, br) => {
    ctx.fillStyle = '#f2a8c0';
    for (let i = 0; i < 7; i += 1) {
      circle(ctx, bx + range(rng, -br, br), by + range(rng, -br * 0.6, br * 0.6), br * 0.42);
      ctx.fill();
    }
    ctx.fillStyle = '#f7c9d8';
    circle(ctx, bx, by, br * 0.5);
    ctx.fill();
  };
  blossom(96, 138, 30);
  blossom(168, 146, 24);
  blossom(34, 152, 22);
  // One whole branch of blossom is missing on the right panel.
  if (!on.has('blossom')) blossom(132, 96, 22);
  // The pond.
  const pond = ctx.createLinearGradient(0, 260, 0, 500);
  pond.addColorStop(0, '#4f8fb8');
  pond.addColorStop(1, '#2c5a80');
  ctx.fillStyle = pond;
  ctx.beginPath();
  ctx.ellipse(300, 380, 262, 122, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7fb069';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(300, 380, 262, 122, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.ellipse(300, 380, 60 + i * 48, 26 + i * 20, 0, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  // Koi, swimming in the pond.
  koi(ctx, 230, 360, 26, 0.25, false);
  koi(ctx, 350, 410, 30, -0.35, true);
  koi(ctx, 300, 330, 20, 2.8, false);
  koi(ctx, 180, 420, 18, 0.9, true);
  if (on.has('koi')) koi(ctx, 372, 388, 16, 1.4, false);
  // Lily pads, one with a flower that is gone on the right.
  lilyPad(ctx, 470, 300, 30, on.has('flower') ? null : '#f27fa8');
  lilyPad(ctx, 150, 330, 24, null);
  lilyPad(ctx, 180, 368, 26, null);
  // A frog sits on a pad only on the right panel.
  if (on.has('frog')) {
    ctx.fillStyle = '#5da24a';
    circle(ctx, 180, 362, 12);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(180, 372, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f5f0dc';
    circle(ctx, 175, 352, 4);
    ctx.fill();
    circle(ctx, 185, 352, 4);
    ctx.fill();
    ctx.fillStyle = '#1c1c22';
    circle(ctx, 175, 352, 2);
    ctx.fill();
    circle(ctx, 185, 352, 2);
    ctx.fill();
  }
  // Stepping stones up the bottom-left bank.
  const stones = [[70, 470, 26], [120, 496, 22], [170, 516, 20]];
  stones.forEach((s, i) => {
    if (i === 1 && on.has('stone')) return;
    ctx.fillStyle = '#9a938a';
    ctx.beginPath();
    ctx.ellipse(s[0], s[1], s[2], s[2] * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(s[0] - 5, s[1] - 4, s[2] * 0.5, s[2] * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // Stone lantern on the right bank: lit warm, or dark on the right.
  ctx.fillStyle = '#8a8578';
  ctx.fillRect(506, 330, 28, 14);
  ctx.fillRect(512, 344, 16, 26);
  ctx.fillRect(500, 370, 40, 12);
  ctx.fillRect(508, 382, 24, 30);
  ctx.fillRect(498, 412, 44, 10);
  ctx.fillStyle = on.has('lantern') ? '#3d3a33' : '#ffcf7a';
  ctx.fillRect(514, 348, 12, 18);
  if (!on.has('lantern')) {
    const glow = ctx.createRadialGradient(520, 357, 2, 520, 357, 46);
    glow.addColorStop(0, 'rgba(255, 200, 110, 0.45)');
    glow.addColorStop(1, 'rgba(255, 200, 110, 0)');
    ctx.fillStyle = glow;
    circle(ctx, 520, 357, 46);
    ctx.fill();
  }
  // The arched bridge over the pond's top edge.
  ctx.strokeStyle = '#a83c32';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(150, 300);
  ctx.quadraticCurveTo(300, 210, 450, 300);
  ctx.stroke();
  ctx.strokeStyle = '#c9503f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(150, 292);
  ctx.quadraticCurveTo(300, 202, 450, 292);
  ctx.stroke();
  // Bridge planks: one is missing on the right panel. The plank line
  // follows the same quadratic as the arch (y = 300 - 180*u*(1-u)).
  for (let i = 0; i < 7; i += 1) {
    if (i === 3 && on.has('plank')) continue;
    const u = i / 6;
    const bx = 150 + u * 300;
    const by = 296 - 180 * u * (1 - u);
    ctx.fillStyle = '#d8a05a';
    ctx.fillRect(bx - 12, by - 4, 24, 8);
  }
}

// ---- scene 3: Rooftop Fireworks -------------------------------------------

const ROOF_DIFFS = [
  { id: 'burst', name: 'the big firework colour', x: 0.5, y: 0.28, r: 34 },
  { id: 'window', name: 'a lit window', x: 0.81, y: 0.828, r: 20 },
  { id: 'smoke', name: 'the chimney smoke', x: 0.55, y: 0.42, r: 28 },
  { id: 'cat', name: 'the cat on the roof', x: 0.8, y: 0.644, r: 24 },
  { id: 'antenna', name: 'the rooftop antenna', x: 0.643, y: 0.556, r: 22 },
  { id: 'flag', name: 'the little flag', x: 0.227, y: 0.63, r: 22 },
  { id: 'spark', name: 'a small firework', x: 0.25, y: 0.37, r: 30 },
];

// One firework burst: streaks and sparks from a seeded set of angles.
function burst(ctx, x, y, r, color, seed, t) {
  const rng = makeRng(seed);
  const glow = ctx.createRadialGradient(x, y, 2, x, y, r * 1.25);
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = glow;
  circle(ctx, x, y, r * 1.25);
  ctx.fill();
  ctx.globalAlpha = 1;
  const flick = 0.85 + 0.15 * Math.sin(t * 3 + seed);
  for (let i = 0; i < 26; i += 1) {
    const a = rng() * Math.PI * 2;
    const d = r * (0.55 + rng() * 0.45) * flick;
    const sx = x + Math.cos(a) * d;
    const sy = y + Math.sin(a) * d;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.18, y + Math.sin(a) * r * 0.18);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    ctx.fillStyle = '#fff8dc';
    circle(ctx, sx, sy, 2.4);
    ctx.fill();
  }
  ctx.fillStyle = '#fff8dc';
  circle(ctx, x, y, 4);
  ctx.fill();
}

function paintRoofs(ctx, w, h, on, t) {
  const rng = makeRng(303);
  sky(ctx, w, h, '#14102e', '#3a2358', '#6e3a5e');
  stars(ctx, rng, w, h, 46, t, 200);
  // Crescent moon, top left.
  ctx.fillStyle = '#f7ead0';
  circle(ctx, 88, 66, 26);
  ctx.fill();
  ctx.fillStyle = '#241a44';
  circle(ctx, 100, 58, 23);
  ctx.fill();
  // Fireworks: the big one changes colour, the small blue one vanishes.
  burst(ctx, 300, 150, 62, on.has('burst') ? '#58c98a' : '#f2b544', 11, t);
  burst(ctx, 452, 218, 40, '#ef7fa8', 23, t);
  if (!on.has('spark')) burst(ctx, 150, 200, 34, '#6fb7ef', 37, t);
  // Rooftops: three buildings with lit windows.
  const buildings = [
    { x: 30, y: 380, w: 180, h: 160, lit: 0.55 },
    { x: 230, y: 330, w: 170, h: 210, lit: 0.6 },
    { x: 420, y: 360, w: 150, h: 180, lit: 0.5 },
  ];
  buildings.forEach((b) => {
    ctx.fillStyle = '#221a3e';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#2e2350';
    ctx.fillRect(b.x, b.y, b.w, 10);
    const cols = Math.floor(b.w / 42);
    const rows = Math.floor(b.h / 48);
    for (let c = 0; c < cols; c += 1) {
      for (let r = 0; r < rows; r += 1) {
        const wx = b.x + 14 + c * 42;
        const wy = b.y + 26 + r * 48;
        const isTarget = b.x === 420 && c === 1 && r === 1;
        const litWin = rng() < b.lit;
        if (isTarget) {
          ctx.fillStyle = on.has('window') ? '#1a1430' : '#ffd97a';
        } else {
          ctx.fillStyle = litWin ? '#ffd97a' : '#1a1430';
        }
        ctx.fillRect(wx, wy, 20, 26);
        if (!isTarget && litWin && rng() < 0.4) {
          ctx.fillStyle = 'rgba(26, 20, 48, 0.7)';
          ctx.fillRect(wx, wy + 10, 20, 3);
        }
      }
    }
  });
  // Chimney on the middle roof, with curling smoke — or none.
  ctx.fillStyle = '#1c1535';
  ctx.fillRect(316, 296, 26, 34);
  ctx.fillStyle = '#2e2350';
  ctx.fillRect(312, 290, 34, 8);
  if (!on.has('smoke')) {
    ctx.strokeStyle = 'rgba(220, 210, 235, 0.55)';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(329, 288);
    ctx.quadraticCurveTo(344, 258, 330, 232);
    ctx.quadraticCurveTo(318, 210, 332, 190);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(220, 210, 235, 0.35)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(331, 226);
    ctx.quadraticCurveTo(344, 204, 334, 186);
    ctx.stroke();
  }
  // Antenna on the middle roof: gone on the right panel.
  if (!on.has('antenna')) {
    ctx.strokeStyle = '#120e26';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(386, 330);
    ctx.lineTo(386, 268);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(368, 288);
    ctx.lineTo(404, 288);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(372, 272);
    ctx.lineTo(400, 272);
    ctx.stroke();
    ctx.fillStyle = '#e4574b';
    circle(ctx, 386, 264, 4);
    ctx.fill();
  }
  // A little flag on the left roof: red on the left, teal on the right.
  ctx.strokeStyle = '#120e26';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(120, 380);
  ctx.lineTo(120, 330);
  ctx.stroke();
  ctx.fillStyle = on.has('flag') ? '#3fb8a6' : '#e4574b';
  ctx.beginPath();
  ctx.moveTo(120, 330);
  ctx.lineTo(152, 340);
  ctx.lineTo(120, 350);
  ctx.closePath();
  ctx.fill();
  // The cat silhouette on the right roof: gone on the right panel.
  if (!on.has('cat')) cat(ctx, 480, 348, 24, '#0e0a20', true);
  // A string of warm windows along the bottom edge.
  ctx.fillStyle = '#171226';
  ctx.fillRect(0, 520, w, 20);
}

// ---- the scene catalogue ---------------------------------------------------

export const SCENES = [
  { name: 'Lantern Market', sub: 'A night market under paper lanterns', diffs: MARKET_DIFFS, paint: paintMarket },
  { name: 'Koi Pond Garden', sub: 'A quiet garden pond at dusk', diffs: POND_DIFFS, paint: paintPond },
  { name: 'Rooftop Fireworks', sub: 'Fireworks over the old rooftops', diffs: ROOF_DIFFS, paint: paintRoofs },
];

// Paint one panel of a scene: `on` holds the ids of the differences this
// panel shows. The left panel passes an empty set, the right all seven.
export function paintPanel(ctx, sceneIndex, on, t) {
  const scene = SCENES[sceneIndex];
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 600, 540);
  ctx.clip();
  scene.paint(ctx, 600, 540, on, t);
  ctx.restore();
}
