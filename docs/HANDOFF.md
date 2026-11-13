# Handoff notes

Why things are the way they are. Keep this current when a decision changes.

- **Stack: TypeScript + Vite, not plain JS.** The original plan said "no build step", but David
  asked for the same setup as his other games (node-wars, flux-engine). GitHub Actions builds
  and deploys to Pages on every push to `main`, so pushing still deploys.
- **Canvas + emoji, no Phaser.** The game is a simple grid; plain Canvas keeps the bundle tiny
  (about 10 KB gzipped) and loads instantly on phones.
- **Sim is pure.** `src/sim/` has no DOM. The scene (`src/scenes/outerDefense.ts`) calls
  `step()` and turns `run.events` into popups, beams and screen shake. This lets the bot in
  `src/sim/playtest/bot.ts` play whole runs in tests.
- **Evolve is a Relic upgrade, not an in-run purchase** (David, Nov 2026). Each run starts in
  the highest era you have unlocked, with that era's gold and wall. Later eras skip ahead to one
  enemy tier below the era (`firstWave` in `createRun`) so runs don't open with a slog.
- **The first run is short on purpose** (about 1.5 minutes): fast early runs get kids to new
  towers and updates quickly. `balance.test.ts` locks Stone Age at 50-150 s of game time and
  checks the first run pays enough Relics to evolve. Waves come on their own 5 s after the
  previous wave finishes spawning; tapping ⏩ calls it early for bonus gold.
- **Relics** = wave reached + 2 per boss stopped (`relicsEarned`).
- **Phase 2 will be a side-on 2.5D view** (David's call), to feel different from the top-down
  Phase 1. The results screen shows a "coming soon" teaser in its place.
- **Breach = outer wall HP hits 0** (plan's recommended option). Enemies that reach the base
  hurt the wall: 1 normal, 2 heavy, 5 boss.
- **Waves never stop getting harder**, so every run ends in a breach (and Phase 2). Enemy HP
  ramps within each 5-wave tier, so the end of a tier is the wall your era has to beat.
- **War Chest** is separate from gold and only counts up: 1 + tier per kill, plus
  20 × (tier + 1) per boss.
- **UI is DOM, map is canvas.** Buttons in the panel are built once and only toggled each
  frame, so a kill (gold change) never rebuilds a button mid-tap.
- **Saves:** one versioned localStorage key (`eraDefense.save`), every access in try/catch.
- **`?dev` in the URL** starts a run with 99,999 gold for testing.
