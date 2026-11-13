// Bot playtest: for each starting era, how long does a decent player hold the wall?
// Run with `npm run balance [-- <runs per era>]`.
import { ERAS } from '../src/sim/data/eras';
import { playRun } from '../src/sim/playtest/bot';

const runs = Number(process.argv[2] ?? 10);
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

console.log('Era         | waves reached | time (min:s) | relics | War Chest');
ERAS.forEach((era, i) => {
  const results = Array.from({ length: runs }, (_, k) => playRun(1000 + k, { era: i }));
  const waves = results.map((r) => r.wave).sort((a, b) => a - b);
  const t = Math.round(avg(results.map((r) => r.time)));
  const time = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  console.log(
    `${era.name.padEnd(11)} | ${String(waves[0]).padStart(3)}-${String(waves[runs - 1]).padEnd(9)} | ${time.padStart(12)} | ${String(Math.round(avg(results.map((r) => r.relics)))).padStart(6)} | ${Math.round(avg(results.map((r) => r.chest)))}`,
  );
});
