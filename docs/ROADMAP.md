# Roadmap

The full plan is in [PROJECT_PLAN.md](PROJECT_PLAN.md). This file tracks where we are.

## Done

- **M0 Setup:** Vite + TypeScript project, GitHub Pages deploy, tests and a balance bot.
- **M1 Phase 1:** 10×13 path map, 6 eras with Evolve (repairs and grows the wall), 8 towers with
  3 levels, upgrade and sell (70%), 12 enemies, a boss every 5 waves, enemy tier up every 5
  waves, endless scaling after wave 30, 1×/2×/3× speed and pause, outer wall HP bar, BREACH!
  when it hits 0, War Chest counting, results screen with a Phase 2 style vote, 💡 Idea Box,
  best run saved on the device, PWA manifest and icons.

## Next

- **M1 balance pass with the kids.** Knobs: `src/sim/data/game.ts`, `waves.ts`, `towers.ts`,
  `enemies.ts`, `eras.ts`. Check with `npm run balance` after changes.
- **M2 Breach + Last Stand.** Pick the Phase 2 style with the kids (the vote on the results
  screen counts on each device). The breach scene (`src/scenes/breach.ts`) already receives the
  run summary, including the War Chest and era, which is what Phase 2 needs.
- **M3 Roguelite loop:** Relics, upgrade screen, saved progress.
- **M4 Run variety:** card picks every 3 waves, event waves.
- **M5 Polish:** sound, hero unit, base abilities, credits screen.

## Open questions

1. Phase 2 style: top-down or side-view tap-to-shoot?
2. Breach trigger: v1 uses an outer wall HP bar (the plan's recommendation).
3. One save per kid on a shared device?
4. Game name (let the kids vote).
