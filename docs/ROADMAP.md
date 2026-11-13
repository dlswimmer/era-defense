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
- **Free-placement Phase 1 (Nov 13):** enemies follow a smooth, winding dirt trail; towers go
  anywhere on the grass that isn't the trail, a decoration, the base or another tower. Pick a
  tower in the shop and drag it onto the map (or tap it, then tap the map); the range circle
  shows white where it fits and red where it doesn't. On touch the tower floats above your
  finger. Grass, trail and scenery are drawn once per era and cached.
- **Phase 1 polish (Nov 13):** towers stand on wooden platforms with a blue rim (Stone Age
  scenery is now plants and logs, not rocks), enemies bob and flash when hit, towers bounce
  when they fire, chevrons show the trail entrance between waves, the base pulses red when an
  enemy gets within 6 tiles, and each tower can aim at First, Strong or Close. The map is a
  little bigger on phones.
- **First leak ends Phase 1 (Nov 13):** no wall HP bar any more. Thick Walls became Strong Arms
  (+10% tower damage per level; old saves keep their levels).

- **Last Stand v2 (Phase 2, Nov 13):** after the first leak, a 2.5D side view of the wall
  (HP = era wall × 15), styled per era: log palisade, sandstone, castle stone, brick, concrete,
  energy shield. Enemies start about 2 screens away on a 3-screen field; drag (or scroll, or tap
  the mini-map) to see them coming. Buying a defender with the War Chest ⚔️ puts it on the wall
  by itself (10 places; one defender type per era for now). No per-defender upgrades: team
  boosts instead (💥 Power, ⚡ Speed, 🎯 Reach, 🧱 Repair), pricier each level and in later eras.
  Relics = Phase 1 + 1 per wave held at the wall + 2 per boss. Bot runs last 40-80 s.
  `?stand=<era>` jumps straight into a Last Stand for testing.

## Decided in planning (Nov 13) — not built yet

- **Long-running meta loop.** Runs stay short, but permanent progress should last months, with
  many layers of upgrades (idle tower defense style). Details to plan with David.
- **Eras are long chapters.** Evolving to the next era should take a long time.
- **4 towers + 4 wall units per era** (24 of each; which ones is TBD with the kids). The shop
  shows only the current era's towers (no locked next-era teasers); ones you can't afford yet
  are grayed out. You get
  just 1 tower and 1 unit when you enter an era and unlock the rest one at a time.
- **Older-era towers/units stay usable** but are weaker; tune so a maxed older tower is roughly
  as good as a fresh one from the next era.
- **Harder maps for later.** Once players have strong upgrades, new harder maps (shorter
  trails, more bends to cover) keep Phase 1 short instead of letting it run for 20 minutes.
  A map is one entry in `src/sim/data/maps.ts`.
- **Phase 2 is a side view**: your wall on the left, enemies come from the right, and you
  build units on the wall using the War Chest.
- **Look (David, Nov 13):** cartoon sprites drawn in code with thick outlines. Towers and
  defenders are people who wind up and throw. Enemies are monsters that get more armored, then
  robotic, era by era. Stone Age is done first; other eras keep emoji until they get art.

## Next

- **M1 balance pass with the kids.** Knobs: `src/sim/data/game.ts`, `waves.ts`, `towers.ts`,
  `enemies.ts`, `eras.ts`. Check with `npm run balance` after changes.
- **Graphics pass, Stone Age done** (Rock Thrower, Spear Thrower, Grumbler, Woolly Brute, hut,
  trees). Get the kids' reactions, then do the next era's people and monsters in `src/art/`.
- **Last Stand next steps:** pick the 4 defenders per era with the kids (data in
  `src/sim/data/units.ts`), a 2.5D look in the graphics pass, flying enemies, wall repair.
- **M3 rest:** more upgrades (tower mastery, heroes, base blueprints), Relics from Phase 2 time.
- **M4 Run variety:** card picks every 3 waves, event waves.
- **M5 Polish:** sound, hero unit, base abilities, credits screen.

## Open questions

1. One save per kid on a shared device?
2. Game name (let the kids vote).

Decided: Phase 2 is a side view; the first leak ends Phase 1; Evolve is a Relic upgrade.
