// Shared constants for Lantern Row, a spot-the-difference game.
// One place for every number the renderers, the state machine and the
// screenshot staging agree on, so a panel never drifts from its hit zone.

export const VIEW_W = 1280;
export const VIEW_H = 720;

// The two pictures sit side by side under the top bar.
export const PANEL = { w: 600, h: 540, xLeft: 20, xRight: 660, y: 92 };
export const TOP_BAR_H = 76;
export const BOTTOM_BAR_Y = 648;

export const TIME_PER_SCENE = 150; // seconds on the clock when a scene starts
export const POINTS_FOUND = 100;
export const POINTS_WRONG = -25;
export const POINTS_HINT = -50;
export const TIME_BONUS_FOUND = 5; // seconds added per find
export const TIME_PENALTY_WRONG = 5; // seconds lost per miss
export const HINTS_PER_SCENE = 3;
export const DIFFS_PER_SCENE = 7;

export const SCENES = [
  { name: 'Lantern Market', sub: 'A night market under paper lanterns' },
  { name: 'Koi Pond Garden', sub: 'A quiet garden pond at dusk' },
  { name: 'Rooftop Fireworks', sub: 'Fireworks over the old rooftops' },
];

// Colours of the game's chrome, shared by the HUD and the title screen.
export const CHROME = {
  bg: '#171226',
  bar: '#241b3d',
  barLine: '#3d2f66',
  ink: '#f5edd8',
  dim: '#b9aed6',
  gold: '#f2b544',
  red: '#e4574b',
  teal: '#3fb8a6',
  panelLine: '#4a3a75',
};
