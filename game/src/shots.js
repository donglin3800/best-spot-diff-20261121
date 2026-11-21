// Deterministic staging for screenshots (?shot=start|play|play2|end).
// A shot puts the real game into a real state — title, mid-hunt with
// markers already on the board, or the victory screen — and freezes the
// animation clock, so the same URL always renders the same frame.

export const SHOT_TIME = 1.25; // frozen animation time, in seconds

// Apply a shot to a fresh game. Returns true when a shot was staged.
// NOTE: startGame() replaces game.state with a fresh object, so the state
// is always read AFTER that call, never cached across it.
export function stageShot(game, name) {
  if (name === 'start') {
    game.toTitle();
    game.shotMode = true;
    return true;
  }
  if (name === 'play') {
    game.startGame();
    game.shotMode = true;
    game.loadScene(0);
    const state = game.state;
    const ids = state.scene.diffs.slice(0, 3).map((d) => d.id);
    state.found = new Set(ids);
    state.score = 350;
    state.timeLeft = 118;
    state.hintsLeft = 2;
    state.message = 'Three found already — four still hiding. Look closely!';
    state.messageTone = '';
    return true;
  }
  if (name === 'play2') {
    game.startGame();
    game.shotMode = true;
    game.loadScene(1);
    const state = game.state;
    const ids = state.scene.diffs.slice(0, 2).map((d) => d.id);
    state.found = new Set(ids);
    state.score = 520;
    state.timeLeft = 96;
    state.hintsLeft = 3;
    state.message = 'Two found in the garden — five still hiding.';
    state.messageTone = '';
    return true;
  }
  if (name === 'end') {
    game.startGame();
    game.shotMode = true;
    game.loadScene(2);
    const state = game.state;
    state.cleared = [true, true, true];
    state.sceneIndex = 2;
    state.found = new Set(state.scene.diffs.map((d) => d.id));
    state.score = 2140;
    state.best = 2140;
    state.totalFound = 21;
    state.message = 'Every difference found — well done!';
    state.messageTone = 'good';
    state.screen = 'victory';
    return true;
  }
  return false;
}
