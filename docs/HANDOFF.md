# Handoff notes

Why things are the way they are. Keep this current when a decision changes.

- **Stack: TypeScript + Vite, not plain JS.** The original plan said "no build step", but David
  asked for the same setup as his other games (node-wars, flux-engine). GitHub Actions builds
  and deploys to Pages on every push to `main`, so pushing still deploys.
- **Canvas + emoji, no Phaser.** Plain Canvas keeps the bundle tiny (about 10 KB gzipped) and
  loads instantly on phones.
- **Free placement, not a grid** (David, Nov 13: "more like Bloons"). The world is still
  measured in tiles (the map is 10×13 of them, ranges and speeds use the same unit), but towers
  sit at any (x, y). The trail is a Catmull-Rom curve through the map's control points
  (`smoothTrail` in `src/sim/path.ts`); `isBuildable` keeps towers off the trail, decorations,
  the base and each other (`GAME.towerRadius`). Shop buttons release pointer capture so a
  finger can drag from the button onto the canvas; `main.ts` forwards page-wide moves/ups.
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
- **Phase 2 is a side view** (David's call), to feel different from the top-down Phase 1.
  v1 is flat 2D side-on (`src/scenes/lastStand.ts`); depth/2.5D can come with the graphics pass.
  Defenders go on 4 fixed spots on the wall (tap a spot, then a defender, or just tap a
  defender to fill the next spot) because a tall wall fits a portrait phone well.
- **Phase 1 Relics are saved when Phase 1 ends**, and the Last Stand adds its own when the wall
  falls, so closing the app mid-Last-Stand never loses Phase 1 progress.
- **The Last Stand replays the wave that broke through** and always gives at least
  `STAND.minChest` War Chest, so even a rough Phase 1 gets one defender.
- **Breach = the first enemy that reaches the base** (David, Nov 13). No wall HP in Phase 1;
  `era.wallHp` is kept for the Last Stand. Thick Walls became Strong Arms (save v3 migrates
  the levels). The balance test now checks every era is a short run (1-5 minutes).
- **Waves never stop getting harder**, so every run ends with a leak (and Phase 2). Enemy HP
  ramps within each 5-wave tier, so the end of a tier is the wall your era has to beat.
- **War Chest** is separate from gold and only counts up: 1 + tier per kill, plus
  20 × (tier + 1) per boss.
- **UI is DOM, map is canvas.** Buttons in the panel are built once and only toggled each
  frame, so a kill (gold change) never rebuilds a button mid-tap.
- **Saves:** one versioned localStorage key (`eraDefense.save`), every access in try/catch.
- **`?dev` in the URL** starts a run with 99,999 gold for testing.
