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
- **Evolve lives in the upgrade web, not in a run** (David, Nov 2026). Each run starts in
  the newest era you have reached, with that era's gold and wall. Later eras skip ahead to one
  enemy tier below the era (`firstWave` in `createRun`) so runs don't open with a slog.
- **The first run is short on purpose** (about 1.5 minutes): fast early runs get kids to new
  towers and updates quickly. `balance.test.ts` locks Stone Age at 50-150 s of game time. Waves come on their own 5 s after the
  previous wave finishes spawning; tapping ⏩ calls it early for bonus gold.
- **Upgrade web** (David, Nov 13, like node-wars): Home in the middle, eras in a ring around it
  (Stone Age at the top, clockwise), each era a slice: towers fan left, defenders right, Camp
  upgrades down the middle, and every tower and defender has a line of 8 upgrades outward. The
  nodes are built from the eras/towers/units data (`src/sim/web.ts`), so a new tower appears in
  the web by itself; empty slots (up to 4 per era) show as "?" until the kids pick one and don't
  count toward the gate. Only bought ids are saved (`meta.web`); free nodes (an era's first
  tower and defender) come with their parent.
- **Evolve gate:** to buy the next era, every tower and defender of your era must be unlocked
  with its first 2-4 upgrades (`WEB.gateUpgrades`). That pushes kids to use everything first.
- **Pacing** (David: "think Bloons, dozens of hours", early eras quick, later ones slower):
  `WEB.price` grows faster per era than `WEB.reward`. Campaign bot (Nov 13): Stone Age ~14
  runs, Ancient ~27, Medieval ~42, Gunpowder ~50, Modern ~71: about 15 hours to reach the
  Future and 35 to buy everything (a focused bot; real kids will be slower). When the kids fill
  the empty slots the gate grows, so re-check with `npm run balance -- campaign`.
- **Coins, not Relics** (David): copper, silver, gold, platinum, each 100× the one before.
  Stored as one number of copper; shown as the two biggest tiers. Rewards are ×10 per era, so
  later eras pay in shinier coins. Coins per run = (wave reached + 2 per boss) in each phase ×
  the era's reward scale × Lucky Find.
- **Save v4** turned Relics into copper, kept reached eras, and refunded Treasure/Strong Arms
  levels as coins to spend in the web.
- **Phase 2 is a side view** (David's call), to feel different from the top-down Phase 1.
  It's drawn 2.5D with a simple oblique projection (`STAND.skew`): x along the field, y height,
  z depth, screen = (x + z·skew, y − z·skew). The sim tracks z so enemies spread across the road.
- **Last Stand v2 (David, Nov 13):** no fixed spots; bought defenders fill the wall by
  themselves, no per-defender upgrades, team boosts instead. Enemies start ~2 screens away so
  there's time to get ready, and the field can be dragged to see what's coming.
- **Phase 1 coins are saved when Phase 1 ends**, and the Last Stand adds its own when the wall
  falls, so closing the app mid-Last-Stand never loses Phase 1 progress.
- **The Last Stand replays the wave that broke through** and always gives at least
  `STAND.minChest` War Chest, so even a rough Phase 1 gets one defender.
- **Breach = the first enemy that reaches the base** (David, Nov 13). No wall HP in Phase 1;
  `era.wallHp` is kept for the Last Stand. Thick Walls became Strong Arms (save v3 migrates
  the levels). The balance test now checks every era is a short run (1-5 minutes).
- **Waves never stop getting harder**, so every run ends with a leak (and Phase 2). Enemy HP
  ramps within each 5-wave tier, so the end of a tier is the wall your era has to beat.
- **Waves stay in your era** (David, Nov 13): enemy tiers stop at the run's era, so next-era
  enemies are a surprise for after you evolve. Past the era's own tiers, HP grows
  `WAVES.pastEraGrowth` per wave instead, and every 5 waves the same monsters level up in looks
  (`rankFor`: new color, then a bone helmet, hide armor, back spikes).
- **War Chest** is separate from gold and only counts up: 1 + tier per kill, plus
  20 × (tier + 1) per boss.
- **UI is DOM, map is canvas.** Buttons in the panel are built once and only toggled each
  frame, so a kill (gold change) never rebuilds a button mid-tap.
- **Sprites are drawn in code, not images** (David, Nov 13, Stone Age first). `src/art/sprites.ts`
  draws cartoon people and monsters with thick outlines, feet at (0, 0), facing right;
  `src/art/cast.ts` says which tower, defender, enemy and scenery uses which sprite. Anything
  without an entry still shows its emoji. Throw animations are worked out from the sim's
  cooldowns (wind up just before a shot, follow through after), so the sim stays unchanged.
  Enemies are monsters (easy to tell from your people, friendlier to "stop"); later eras add
  armor, then robot parts. In the Last Stand, defenders fill the front rank along the enemy
  edge first, then a second rank behind (`seatPos`).
- **Nets** (Net Thrower): a net is a splash shot whose hits set `netUntil` on each monster
  caught. Normal monsters stop until then; heavy ones and bosses move at `toughSlow`. Nets skip
  monsters already caught so no throw is wasted. The bot only builds a couple, next to its
  damage towers (`netSpot`), because a net on its own does nothing.
- **Upgrade swaps:** every tower and defender gets the same 8-step line, but
  `STEP_SWAPS` in `src/sim/data/web.ts` can replace steps for one of them (same place and
  price), e.g. Sticky Net instead of Power for the Net Thrower.
- **Saves:** one versioned localStorage key (`eraDefense.save`), every access in try/catch.
- **`?dev` in the URL** starts a run with 99,999 gold for testing.
