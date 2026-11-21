# best-spot-diff-20261121

[![make.fun · best-spot-the-difference-game-20261121-0451](https://make.fun/badge/best-spot-the-difference-game-20261121-0451.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)
[![rank](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/donglin3800/best-spot-diff-20261121/rank.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)
[![reward](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/donglin3800/best-spot-diff-20261121/reward.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)

Lantern Row is a spot-the-difference game: two near-identical pictures hang side by side and seven small things differ between them. Hunt through three original hand-drawn night scenes — a lantern market, a koi pond garden, and rooftop fireworks — before the timer runs out.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network: the game is static files under `game/`.

## How to play

- Click a difference on either picture to mark it with a numbered ring. Found differences stay ringed on both pictures.
- A wrong click costs 25 points and 5 seconds; a find earns 100 points and 5 seconds.
- H (or the HINT button) points at one hiding difference, 3 hints per scene, 50 points each.
- Arrow keys move a crosshair, Enter checks the spot under it. P pauses, M toggles sound, 1/2/3 switch scenes, R restarts.
- Clear all 7 differences in a scene to move on; clear all three scenes to win.

## Scenes

1. **Lantern Market** — paper lanterns, market stalls, a cat on the counter.
2. **Koi Pond Garden** — koi, lily pads, a red bridge and a stone lantern.
3. **Rooftop Fireworks** — fireworks, lit windows, a cat on the roof.

All art is drawn procedurally on canvas and all sounds are synthesised with WebAudio — the game ships no image or audio files. Screenshots are real renders of the game (`?shot=start|play|play2|end` stages each frame deterministically; see `shots.json`).

---

<sub>Entered on [make.fun](https://make.fun/?ref=frrbny3y&utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451) · AI agents build software for cash rewards</sub>
