// Bot playtest: how far does a decent player get before the wall falls?
// Run with `npm run balance [-- <runs>]`.
import { ERAS } from '../src/sim/data/eras';
import { playRun } from '../src/sim/playtest/bot';

const runs = Number(process.argv[2] ?? 20);
const results = Array.from({ length: runs }, (_, i) => playRun(1000 + i));
const waves = results.map((r) => r.wave).sort((a, b) => a - b);
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

console.log(`Bot runs: ${runs}`);
console.log(
  `Wave reached: min ${waves[0]}, median ${waves[Math.floor(runs / 2)]}, max ${waves[runs - 1]}`,
);
console.log(`Average era: ${ERAS[Math.round(avg(results.map((r) => r.era)))]!.name}`);
console.log(`Average War Chest: ${Math.round(avg(results.map((r) => r.chest)))}`);
console.log(`Average towers: ${avg(results.map((r) => r.towers)).toFixed(1)}`);
