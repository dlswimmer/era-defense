# Roadmap

The full plan is in [PROJECT_PLAN.md](PROJECT_PLAN.md). This file tracks where we are.

## Done

- **M0 Setup:** Vite + TypeScript project, GitHub Pages deploy, tests and a balance bot.
- **M1 Phase 1:** 10×13 path map, 6 eras, 8 towers with
  3 levels, upgrade and sell (70%), 12 enemies, a boss every 5 waves, enemy tier up every 5
  waves, endless scaling after wave 30, 1×/2×/3× speed and pause, outer wall HP bar, BREACH!
  when it hits 0, War Chest counting, results screen with a Phase 2 style vote, 💡 Idea Box,
  best run saved on the device, PWA manifest and icons.

- **Roguelite loop, first pass (part of M3):** Relics 🦴 after every run, Upgrades screen with
  Evolve (unlock the next era), Treasure (+start gold) and Thick Walls (+wall HP). Waves flow on
  their own with a ⏩ early-call bonus. First run lasts about 1.5 minutes.

## Next

- **M1 balance pass with the kids.** Knobs: `src/sim/data/game.ts`, `waves.ts`, `towers.ts`,
  `enemies.ts`, `eras.ts`. Check with `npm run balance` after changes.
- **Graphics pass** (David wants better art than plain emoji).
- **M2 Breach + Last Stand:** side-on 2.5D view of the base. The breach scene
  (`src/scenes/breach.ts`) already receives the run summary, including the War Chest and era.
- **M3 rest:** more upgrades (tower mastery, heroes, base blueprints), Relics from Phase 2 time.
- **M4 Run variety:** card picks every 3 waves, event waves.
- **M5 Polish:** sound, hero unit, base abilities, credits screen.

## Open questions

1. One save per kid on a shared device?
2. Game name (let the kids vote).

Decided: Phase 2 is side-on 2.5D; the breach trigger is the wall HP bar; Evolve is a Relic upgrade.
