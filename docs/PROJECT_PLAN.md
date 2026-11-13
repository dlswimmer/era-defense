# Era Defense: Project Plan

> A roguelite tower defense game where your army evolves from rocks to lasers, and every run ends in a last stand.
> Built by David and his kids. The kids test the game and suggest features.

---

## 1. Vision

- **Who it's for:** David and his kids. It should be fun, readable and forgiving, and kids should be able to pick it up in about 30 seconds.
- **Platforms:** mobile first (portrait, touch); also works on desktop (mouse).
- **Hosting:** a static site on **GitHub Pages** (`<user>.github.io/era-defense`). No server.
- **Design principle:** every kid's idea should be small and self-contained to add (a new tower, enemy, card or event) and show up in the game within a day or two, with on-screen credit for whoever suggested it.

## 2. Core Loop

```
 ┌─────────────────────────────────────────────────────────────┐
 │  RUN START (spend Relics on upgrades and unlocks)            │
 │      ↓                                                       │
 │  PHASE 1: OUTER DEFENSE (tower defense)                      │
 │    waves escalate without end, so a breach is guaranteed     │
 │    gold → towers / upgrades / Evolve to next era             │
 │    kills → War Chest                                         │
 │      ↓  outer wall HP hits 0                                 │
 │  💥 BREACH!  (zoom to base, switch modes)                     │
 │      ↓                                                       │
 │  PHASE 2: LAST STAND (base defense)                          │
 │    spend War Chest on walls / traps / defenders / abilities  │
 │    gear available depends on the era reached in Phase 1      │
 │      ↓  base falls                                           │
 │  RUN SUMMARY → earn Relics 🦴 → upgrade screen → new run      │
 └─────────────────────────────────────────────────────────────┘
```

## 3. Currencies

| Currency         | Earned by                                                             | Spent on                       | Kept after the run? |
| ---------------- | --------------------------------------------------------------------- | ------------------------------ | ------------------- |
| **Gold** 💰      | kills and wave-clear bonuses in Phase 1                               | towers, tower upgrades, Evolve | ❌                  |
| **War Chest** ⚔️ | kills in Phase 1 (bosses give a bonus)                                | Phase 2 defenses               | ❌                  |
| **Relics** 🦴    | end of run: waves held + era reached + bosses + Phase 2 time survived | permanent upgrades and unlocks | ✅                  |

The War Chest is kept separate from gold on purpose, so players never have to choose between spending now and saving for later.

## 4. Eras

Each era unlocks towers, changes how the map looks, upgrades the base, and decides which Phase 2 gear can be bought.

| #   | Era       | Base | Towers unlocked           | Enemies                      | Phase 2 gear (examples)            |
| --- | --------- | ---- | ------------------------- | ---------------------------- | ---------------------------------- |
| 0   | Stone Age | 🛖   | 🪨 Rock Thrower           | 🧔 Caveman, 🦣 Mammoth       | wooden spikes, rock drop           |
| 1   | Ancient   | 🏛️   | 🏹 Archer                 | 🛡️ Warrior, 🐎 Chariot       | stone wall, spearmen               |
| 2   | Medieval  | 🏰   | 🎯 Catapult               | 🏇 Knight, 🪵 Battering Ram  | gate, boiling oil                  |
| 3   | Gunpowder | 🏯   | 💣 Cannon                 | 💂 Musketeer, ⛵ Pirate Ship | cannons on walls, powder kegs      |
| 4   | Modern    | 🏢   | 🔫 Machine Gun, 🚀 Rocket | 🪖 Soldier, 🚁 Helicopter    | turrets, mines, airstrike          |
| 5   | Future    | 🌐   | 🔆 Laser, ⚡ Tesla Coil   | 🤖 Robot, 🛸 UFO             | force field, drones, orbital laser |

- Enemy tier goes up every 5 waves. There's a boss on every 5th wave. After wave 30 the game continues with steadily tougher enemies.
- **Evolve** costs gold: it unlocks the next era, fully repairs the base and raises its max health.
- Towers have 3 levels (upgrade or sell for 70% of what was spent).

## 5. Roguelite Systems

### 5a. Meta progression (bought with Relics, permanent)

- **Starting perks:** more starting gold, extra lives, a free tower at the start.
- **Era head start:** begin a run in a later era.
- **Tower mastery:** permanent damage and range boosts for each tower type.
- **Unlocks:** new towers, heroes, base abilities, Phase 2 traps. _Unlocking things matters more than % boosts for kids._
- **Base blueprints:** a tougher starting base for Phase 2.

### 5b. Run variety

- **Card picks:** every 3 waves, choose 1 of 3 random cards (e.g., _Flaming Arrows_, _Rocks Bounce_, _Bosses drop double_, _+1 Tesla chain_).
- **Event waves:** e.g., _Mammoth Stampede_, _Fog (−range)_, _Gold Rush_.
- **Random maps or paths** for each run (later).

## 6. Phase 2: Last Stand (⚠️ open decision)

Ask the kids to choose:

- **A) Top-down, zoomed in:** same view style as Phase 1, focused on the base. Place walls, traps and defenders. Less to build because it reuses Phase 1 code.
- **B) Side view, tap to shoot:** enemies charge or climb the walls and you tap to fire, castle-defense style. Feels very different and is great on phones, but it's a second game mode to build.

Possible extra: a **Reinforcements** comeback. Surviving long enough in Phase 2 grants one chance to rebuild the outer defenses.

## 7. Tech Stack

> **Update (Nov 2026):** the game uses TypeScript + Vite like David's other games, deployed to Pages by GitHub Actions. See `docs/HANDOFF.md`.

- **Plain JavaScript (ES modules) + HTML5 Canvas.** No framework and no build step, so pushing to `main` deploys.
- **Emoji graphics** for now (free, readable, kid-friendly). Can be swapped for sprites later.
- **Saving:** `localStorage` (Relics, unlocks, best run, idea list), wrapped in try/catch. Saves stay on each device. Cloud saves are a possible later feature.
- **PWA:** add a `manifest.json` and icons so the game can be added to a phone's home screen and opened full screen.
- **Data-driven content:** towers, enemies, eras, cards and events are defined as data in `js/data/`, so adding a kid's idea usually means adding one entry.

### Proposed repo layout

```
era-defense/
├── index.html
├── manifest.json
├── icons/
├── css/style.css
├── js/
│   ├── main.js            # boot, game loop, scene switching
│   ├── state.js           # run state + meta save/load
│   ├── render.js          # canvas drawing helpers
│   ├── input.js           # touch/mouse
│   ├── ui.js              # HUD, shop, panels, modals
│   ├── scenes/
│   │   ├── menu.js        # title + upgrade screen
│   │   ├── outerDefense.js
│   │   ├── breach.js      # transition
│   │   ├── lastStand.js
│   │   └── summary.js
│   └── data/
│       ├── eras.js
│       ├── towers.js
│       ├── enemies.js
│       ├── cards.js
│       ├── events.js
│       └── metaUpgrades.js
├── IDEAS.md               # kids' suggestions + who suggested them
└── PROJECT_PLAN.md        # this file
```

## 8. Milestones

| #         | Milestone           | Done when…                                                                                         |
| --------- | ------------------- | -------------------------------------------------------------------------------------------------- |
| **M0**    | Setup               | Repo created, Pages on, prototype `index.html` split into the module layout above, still playable. |
| **M1**    | Phase 1 complete    | Outer wall HP + breach trigger, War Chest counting, balance pass with the kids.                    |
| **M2**    | Breach + Last Stand | Breach transition and a playable Phase 2 (style chosen in §6) using era-based gear.                |
| **M3**    | Roguelite loop      | Run summary → Relics → upgrade screen → new run. Progress saved in localStorage.                   |
| **M4**    | Run variety         | Card picks, event waves.                                                                           |
| **M5**    | Polish              | Sound effects, PWA install, hero unit, base abilities, credits screen for kid ideas.               |
| **Later** | Stretch             | Random maps, flying enemies, cloud save / family leaderboard, sprite art.                          |

## 9. Kid Feedback Loop

- 💡 button in the game saves ideas (name + text) on the device.
- Copy the best ones into `IDEAS.md` with who suggested them and their status (`idea → planned → in game`).
- Show credit in the game: _"Lava Tower, designed by \___"_.
- Ship small updates often so ideas show up fast.

## 10. Open Questions

1. Phase 2 style: **top-down** or **side-view tap-to-shoot**?
2. What exactly triggers the breach: an outer wall HP bar (recommended), or the first enemy to reach the base?
3. Should each kid have their own save/profile on a shared device?
4. Game name: _Era Defense_, _Breach_, _Evolution Wars_…? (Let the kids vote.)

## 11. Starting Point

`index.html` (v0.1 prototype) is a single file with: a 10×13 path map, 6 eras with Evolve, 8 towers (3 levels each, sell), 12 enemy types + bosses every 5 waves, endless scaling after wave 30, 1×/2×/3× speed, and a 💡 idea box. Not balance-tested yet.

---

### Instructions for Claude (paste into the project instructions)

> This project is **Era Defense**, a mobile-first roguelite tower defense game built with plain JS ES modules + Canvas and no build step, hosted on GitHub Pages. Follow `PROJECT_PLAN.md`. Keep game content data-driven in `js/data/`. Keep it kid-friendly: readable, forgiving, no gore. Prefer small, shippable changes that keep the game playable after every commit. Test on a phone-sized portrait viewport. Save with localStorage behind try/catch. When adding a kid's idea, credit them in `IDEAS.md` and in the game.
