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
- **Breach = outer wall HP hits 0** (plan's recommended option). Enemies that reach the base
  hurt the wall: 1 normal, 2 heavy, 5 boss. Evolve fully repairs the wall and raises max HP.
- **Waves never stop getting harder**, so every run ends in a breach (and Phase 2). The balance
  test checks a decent bot always breaches before wave 45 but gets past wave 12.
- **War Chest** is separate from gold and only counts up: 1 + tier per kill, plus
  20 × (tier + 1) per boss.
- **UI is DOM, map is canvas.** Buttons in the panel are built once and only toggled each
  frame, so a kill (gold change) never rebuilds a button mid-tap.
- **Saves:** one versioned localStorage key (`eraDefense.save`), every access in try/catch.
- **`?dev` in the URL** starts a run with 99,999 gold for testing.
