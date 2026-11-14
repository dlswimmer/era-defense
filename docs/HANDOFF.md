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
- **Waves stay in your era** (David, Nov 13): a run only meets its own era's monsters (Nov 14:
  older ones no longer mix in either, since later eras are the same monsters in better armor).
  Next-era enemies are a surprise for after you evolve. Later eras still start 5 waves early as
  a warm-up; `hpScale` makes those waves only as tough as the era before's monsters. Past the era's own tiers, HP grows
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
- **Monster armor** (`Armor` in `src/art/sprites.ts`): one Grumbler and one Brute drawing for
  every era, with armor 0 (fur, bone gear), 1 (bronze) or 2 (iron); `cast.ts` maps each enemy
  to a monster and an armor. Robot parts are next for the later eras.
- **Monster tricks** are data on the enemy (`src/sim/data/enemies.ts`): `pack` (spawns in a
  quick group, counting toward the wave size), `shell` (extra HP that is used up first, then the
  monster speeds up by `shellSpeed`), `split` (turns into `count` of a `noWave` enemy when
  stopped; the splash loop walks a copy of the list so new bits aren't hit by the same blast),
  `flying` (nets skip it). Both phases handle all of them (`damage` in run.ts, `hurt` in
  stand.ts).
- **Old gear vs new** (David, Nov 14): a maxed tower or defender from the era before should be
  slightly (~10%) better than the next era's fresh starter, and the ones within an era about even.
  A formula (damage × rate × splash) got this badly wrong in play, so worth is now measured by
  playing: `src/sim/playtest/worth.ts` plays each one alone and finds the damage multiplier the
  era's fresh starter would need to do as well (`npm run balance -- units` prints the table;
  `worth.test.ts` locks it up to Medieval). Defenders are scored two ways, averaged: a real Last
  Stand (War Chest, boosts) and a full wall without boosts (per wall spot).
  What it found: (1) old gear kept its cheap old price while gold and War Chest grow each era,
  so a maxed Rock Thrower in Ancient was worth ~2.6 Archers per gold. Now old towers and
  defenders cost more in a newer era (`GAME.oldGearPrice`, ×2.8 trail, ×2.2 wall per era
  behind; upgrades too). (2) At the wall all defenders threw at the same closest monster, so
  single-target defenders wasted most throws and splash ones won. Now they skip a monster that
  enough damage is already flying at. (3) The Catapult was too weak for its price (Medieval only
  worked with cheap old towers as filler), the Boulder Dropper was weak fresh and too strong
  maxed (its Power and Power III are smaller now), Boiling Oil was too weak.
  The bot builds the newest era's towers first now, since old ones are dear, not better.
  Wall monsters grow 36% a wave (was 25%) because the wall got stronger, and web prices for the
  first three eras went up ~20-30% to keep runs per era (17 / 25 / 35); runs are a bit longer,
  so hours went up (Stone Age ~1h25, Medieval done at ~7h40).
- **Upgrade swaps:** every tower and defender gets the same 8-step line, but
  `STEP_SWAPS` in `src/sim/data/web.ts` can replace steps for one of them (same place and
  price), e.g. Sticky Net instead of Power for the Net Thrower.
- **Saves:** one versioned localStorage key (`eraDefense.save`), every access in try/catch.
- **`?dev` in the URL** starts a run with 99,999 gold for testing.
- **Bot testers** (`TESTERS` in `src/sim/playtest/bot.ts`): Optimal, Tower spammer, Upgrader,
  Booster and Casual kid play differently (how often they shop, towers vs upgrades, sloppy
  placement, defenders vs boosts, when they repair). Balance shouldn't only fit the perfect
  bot; `balance.test.ts` checks every tester holds the Stone Age wall for several waves.
- **Last Stand waves** don't start on a timer: the next one waits until the last one has walked
  within `nextWaveWithin` of the wall. On a timer, waves piled up far away while the counter ran
  ahead, and then one huge crowd hit the wall at once. Wall monster HP is its own curve
  (`standHpScale`): gentler than the trail, which gets 20% tougher a wave past the era's tiers.
