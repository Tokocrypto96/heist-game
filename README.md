# Midnight Vault Heist

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Tokocrypto96/heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Tokocrypto96/heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A top-down stealth heist game that runs entirely offline in a desktop browser.
You are the thief: slip through three rooms — the Gallery of Glass, the Vault
Hall and the Penthouse Safe — crack the vault, grab the gold, gems and art, and
reach the exit before the timer runs out.

Guards patrol with vision cones you have to read before you move, cameras sweep
the halls, and every second you spend in a cone or a beam pushes the alarm meter
up. Hit 100% and you are busted. Spend score on tools when the plan falls apart:
a smoke bomb to vanish, an EMP burst to blind the cameras, a lockpick to open
the vault at once. Each room offers several routes, so a careful thief is a rich
one.

## How to play

- **WASD / arrow keys** — move · **click** — walk to a spot
- **E** — crack the vault (stand next to it, hold E)
- **1** — smoke bomb (150 score) · **2** — EMP burst (200 score) · **3** — lockpick (100 score)
- **M** — mute · **R** — retry room · **Enter** — start / next room

Grab the required loot, then reach the green exit. The vault pays +500. Escaping
fast pays a time bonus.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: every script, sound and image is a file
under `game/` (sounds are synthesized in code with WebAudio). Screenshots are
deterministic: `?shot=start|play|end&seed=1` plays the real rules forward with a
simple autopilot.

## Layout

- `game/index.html` — the page
- `game/src/config.js` — tuning and the three floor plans
- `game/src/random.js` — seeded RNG
- `game/src/input.js` — keyboard and mouse
- `game/src/world.js` — rules: patrols, vision, alarm, loot, vault, tools
- `game/src/render.js` — canvas drawing and HUD
- `game/src/audio.js` — WebAudio synth sounds
- `game/src/shots.js` — screenshot autopilot
- `game/src/main.js` — game loop and screens
- `main.ts` — hands the game in (copies `game/` + `screenshots/`, writes `dossier.json`)
- `screenshots/` — three renders of the game itself

## License

MIT — see [LICENSE](LICENSE).
