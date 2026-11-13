# Era Defense: notes for Claude

A mobile-first roguelite tower defense game (TypeScript + Vite + Canvas, emoji graphics) built
with and for David's kids. Must work with touch in portrait on phones, and with a mouse.

## Commands

- `npm run dev`: dev server on port 5173 (exposed on LAN for testing on phones). `?dev` = lots of gold.
- `npm test`, `npm run lint`, `npm run typecheck`, `npm run format`
- `npm run balance`: bots play runs and report the wave/era reached.
- Run lint, format:check, typecheck, and tests before committing; CI runs the same checks.

## Architecture

- `src/sim/` is pure game logic (no DOM). `run.ts` holds Phase 1 rules; `step()` pushes
  `run.events` that scenes turn into effects. Tests sit next to the code (`*.test.ts`).
- Content is data in `src/sim/data/` (eras, towers, enemies, waves, maps, game knobs). Adding a
  kid's idea should usually be one entry there, with `by: '<name>'` for the in-game credit.
- `src/scenes/` draws and handles input: `menu`, `outerDefense` (Phase 1), `breach` (results;
  Phase 2 will start from here). `src/ui/` has DOM helpers and the 💡 Idea Box.
- Saves: `src/save.ts`, versioned localStorage, always in try/catch. Bump the version and
  migrate when the shape changes.
- Use the seeded RNG (`run.rng`) inside the sim, never `Math.random`.
- After balance changes, run `npm run balance`; `src/sim/playtest/balance.test.ts` locks the band.

## Conventions

- Kid-friendly: readable, forgiving, no gore ("enemies stopped", not "killed").
- Keep tap targets at least 44px and test at a phone-sized portrait viewport.
- Small, shippable changes that keep the game playable after every commit.
- Plan in `docs/PROJECT_PLAN.md`, progress in `docs/ROADMAP.md`, reasons in `docs/HANDOFF.md`.
- Credit kids' ideas in `IDEAS.md` and in the game.
