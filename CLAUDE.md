# Era Defense: notes for Claude

A mobile-first roguelite tower defense game (TypeScript + Vite + Canvas, emoji graphics) built
with and for David's kids. Must work with touch in portrait on phones, and with a mouse.

## Commands

- `npm run dev`: dev server on port 5173 (exposed on LAN for testing on phones). `?dev` = lots of gold.
- Dev mode in the game: tap the build info in ⚙️ Options 5 times. It adds coins, skips eras,
  turns on lots of gold in runs and resets the save (`src/ui/devTools.ts`).
- `npm test`, `npm run lint`, `npm run typecheck`, `npm run format`
- `npm run balance`: bots play runs and report the wave/era reached.
- Run lint, format:check, typecheck, and tests before committing; CI runs the same checks.

## Architecture

- `src/sim/` is pure game logic (no DOM). `run.ts` holds Phase 1 rules; `step()` pushes
  `run.events` that scenes turn into effects. Tests sit next to the code (`*.test.ts`).
- Content is data in `src/sim/data/` (eras, towers, enemies, waves, maps, game knobs,
  `units` + `stand` for the Last Stand,
  `web` for upgrade-web prices and effects). Adding a
  kid's idea should usually be one entry there, with `by: '<name>'` for the in-game credit.
- `src/scenes/` draws and handles input: `menu`, `outerDefense` (Phase 1), `lastStand` (Phase 2,
  side view, sim in `src/sim/stand.ts`), `breach` (run results), `upgrades` (the upgrade web: spend coins; Evolve lives here; rules in `src/sim/web.ts`). `src/ui/` has DOM helpers and the 💡 Idea Box.
- `src/art/` draws the cartoon sprites in code (`sprites.ts`) and maps content to them
  (`cast.ts`). Content without art falls back to its emoji.
- Saves: `src/save.ts`, versioned localStorage, always in try/catch. Bump the version and
  migrate when the shape changes.
- Use the seeded RNG (`run.rng`) inside the sim, never `Math.random`.
- After balance changes, run `npm run balance`; `src/sim/playtest/balance.test.ts` locks the band.
  `npm run balance -- campaign` plays a whole campaign through the upgrade web (runs and hours per era).
  `npm run balance -- testers` compares play styles (casual kid, booster...) in the Stone Age.
  `npm run balance -- units` plays each tower and defender alone and prints what it's worth per
  era (old maxed vs new starter, see `src/sim/playtest/worth.test.ts`).
- Coins are one number of copper (`src/sim/coins.ts`), shown as copper/silver/gold/platinum.

## Conventions

- Kid-friendly: readable, forgiving, no gore ("enemies stopped", not "killed").
- Keep tap targets at least 44px and test at a phone-sized portrait viewport.
- Small, shippable changes that keep the game playable after every commit.
- Plan in `docs/PROJECT_PLAN.md`, progress in `docs/ROADMAP.md`, reasons in `docs/HANDOFF.md`.
- Credit kids' ideas in `IDEAS.md` and in the game.
- Every PR that changes the game adds a patch note at the TOP of `src/changelog.ts` (next id,
  usually the PR number), in short kid-friendly words. It shows on the ⚙️ Options screen, with
  build info (version, commit, build time) baked in by `vite.config.ts`.
