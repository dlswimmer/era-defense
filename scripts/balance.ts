// Bot playtests. `npm run balance [-- <runs per era>]`: for each starting era, how long a decent
// player holds out. `npm run balance -- campaign`: a whole campaign through the upgrade web, to
// check how many runs (and hours) each era takes. `npm run balance -- testers`: Stone Age timing
// for different play styles (casual kid, tower spammer, booster...).
import { ERAS } from '../src/sim/data/eras';
import { TESTERS, playCampaign, playRun, playStand } from '../src/sim/playtest/bot';
import { coinText } from '../src/sim/coins';

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const clock = (mins: number) =>
  `${Math.floor(mins / 60)}h ${String(Math.round(mins % 60)).padStart(2, '0')}m`;
/** Menus, the results screen and shopping between runs, in minutes per run. */
const BETWEEN_RUNS = 0.5;

if (process.argv[2] === 'testers') {
  const seeds = [1, 2, 3, 4, 5, 6];
  const range = (xs: number[]) => {
    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    return lo === hi ? `${lo}` : `${lo}-${hi}`;
  };
  const mmss = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  console.log('First Stone Age run, then runs to Evolve out of the Stone Age:');
  console.log('Tester        | trail waves | wall waves | trail time | wall time | runs to Evolve');
  for (const t of TESTERS) {
    const p1 = seeds.map((s) => playRun(s, {}, 3600, t));
    const p2 = p1.map((r, i) =>
      playStand(seeds[i]!, { era: 0, wave: r.wave, chest: r.chest }, 1800, t),
    );
    const evolve = seeds.slice(0, 3).map((s) => playCampaign(s, 0, 3000, t)[0]!.runs);
    console.log(
      `${t.name.padEnd(13)} | ${range(p1.map((r) => r.held)).padStart(11)} | ${range(p2.map((s) => s.held)).padStart(10)} | ${mmss(avg(p1.map((r) => r.time))).padStart(10)} | ${mmss(avg(p2.map((s) => s.time))).padStart(9)} | ${range(evolve)}`,
    );
  }
} else if (process.argv[2] === 'campaign') {
  const seed = Number(process.argv[3] ?? 1);
  console.log('Era         | runs | play time | total so far');
  let total = 0;
  let runs = 0;
  for (const p of playCampaign(seed)) {
    const mins = p.minutes + p.runs * BETWEEN_RUNS;
    total += mins;
    runs += p.runs;
    console.log(
      `${ERAS[p.era]!.name.padEnd(11)} | ${String(p.runs).padStart(4)} | ${clock(mins).padStart(9)} | ${clock(total)} (${runs} runs)`,
    );
  }
  console.log('(The last row runs until everything in the web is bought.)');
} else {
  const runs = Number(process.argv[2] ?? 10);
  console.log('Era         | waves reached | time (min:s) | coins (Phase 1) | War Chest');
  ERAS.forEach((era, i) => {
    const results = Array.from({ length: runs }, (_, k) => playRun(1000 + k, { era: i }));
    const waves = results.map((r) => r.wave).sort((a, b) => a - b);
    const t = Math.round(avg(results.map((r) => r.time)));
    const time = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    console.log(
      `${era.name.padEnd(11)} | ${String(waves[0]).padStart(3)}-${String(waves[runs - 1]).padEnd(9)} | ${time.padStart(12)} | ${coinText(avg(results.map((r) => r.coins))).padStart(15)} | ${Math.round(avg(results.map((r) => r.chest)))}`,
    );
  });
}
