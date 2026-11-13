import { describe, expect, it } from 'vitest';
import { ERAS } from './data/eras';
import { BOOSTS, STAND, boostEffect } from './data/stand';
import { unitDef } from './data/units';
import * as st from './stand';

const fresh = (chest = 100, era = 0) => st.createStand(1, { era, wave: 7, chest });
const boost = (id: string) => BOOSTS.find((b) => b.id === id)!;

describe('Last Stand defenders', () => {
  it('cost War Chest and take the next free place on the wall', () => {
    const stand = fresh(1000);
    const cost = unitDef('spear').cost;
    const a = st.hire(stand, 'spear')!;
    const b = st.hire(stand, 'spear')!;
    expect([a.seat, b.seat]).toEqual([0, 1]);
    expect(stand.chest).toBe(1000 - 2 * cost);
    // Every place is different and they all fit on the wall.
    const seats = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(st.seatPos);
    for (const p of seats) {
      expect(p.x).toBeGreaterThan(STAND.wall.back);
      expect(p.x).toBeLessThan(STAND.wall.front);
      expect(p.z).toBeGreaterThan(0);
      expect(p.z).toBeLessThan(STAND.depth);
    }
    expect(new Set(seats.map((p) => `${p.x},${p.z}`)).size).toBe(10);
  });

  it('stop at a full wall', () => {
    const stand = fresh(10_000);
    for (let i = 0; i < STAND.maxDefenders; i++) expect(st.hire(stand, 'spear')).not.toBeNull();
    expect(st.wallFull(stand)).toBe(true);
    expect(st.hire(stand, 'spear')).toBeNull();
  });

  it("can't be hired without enough War Chest or before their era", () => {
    const poor = fresh(0);
    expect(poor.chest).toBe(STAND.minChest); // always enough for one
    expect(st.hire(poor, 'spear')).not.toBeNull();
    expect(st.hire(poor, 'spear')).toBeNull();
    expect(st.hire(fresh(1000), 'boomerang')).toBeNull();
    expect(st.hire(fresh(1000, 1), 'boomerang')).not.toBeNull();
  });
});

describe('team boosts', () => {
  it('make every defender stronger and cost more each level', () => {
    const stand = fresh(1000);
    const before = st.defenderStats(stand, 'spear');
    const first = st.boostCost(stand, boost('power'))!;
    expect(st.buyBoost(stand, 'power')).toBe(true);
    expect(st.boostCost(stand, boost('power'))!).toBeGreaterThan(first);
    expect(stand.chest).toBe(1000 - first);
    st.buyBoost(stand, 'speed');
    st.buyBoost(stand, 'reach');
    const after = st.defenderStats(stand, 'spear');
    expect(after.dmg).toBeCloseTo(before.dmg * boostEffect.power(1));
    expect(after.rate).toBeCloseTo(before.rate * boostEffect.speed(1));
    expect(after.range).toBeCloseTo(before.range + boostEffect.reach(1));
  });

  it('stop at their max level', () => {
    const stand = fresh(100_000);
    const reach = boost('reach');
    for (let i = 0; i < reach.max!; i++) expect(st.buyBoost(stand, 'reach')).toBe(true);
    expect(st.boostCost(stand, reach)).toBeNull();
    expect(st.buyBoost(stand, 'reach')).toBe(false);
  });

  it('repair heals the wall, but only when it is hurt', () => {
    const stand = fresh(1000);
    expect(st.buyBoost(stand, 'repair')).toBe(false);
    stand.wallHp = 10;
    expect(st.buyBoost(stand, 'repair')).toBe(true);
    expect(stand.wallHp).toBe(10 + Math.round(stand.wallMax * boostEffect.repair));
  });

  it('cost more in later eras', () => {
    expect(st.boostCost(fresh(0, 3), boost('power'))!).toBeGreaterThan(
      st.boostCost(fresh(0, 0), boost('power'))!,
    );
  });
});

describe('the wall', () => {
  it('starts with the era wall HP and replays the wave that broke through', () => {
    const stand = fresh();
    expect(stand.wallMax).toBe(ERAS[0]!.wallHp * STAND.wallHpScale);
    expect(stand.wave).toBe(6);
  });

  it('enemies start far away, walk in and wear the wall down until it falls', () => {
    const stand = fresh(0);
    stand.chest = 0;
    for (let t = 0; t < 3; t += 0.05) st.stepStand(stand, 0.05);
    expect(stand.enemies.length).toBeGreaterThan(0);
    for (const e of stand.enemies) expect(e.x).toBeGreaterThan(STAND.view.width * 2);
    while (!stand.over) st.stepStand(stand, 0.05);
    expect(stand.wallHp).toBe(0);
    expect(stand.events.some((e) => e.type === 'fallen')).toBe(true);
    expect(st.hire(stand, 'spear')).toBeNull();
  });

  it('defenders stop enemies and refill the War Chest', () => {
    const stand = fresh(100);
    for (let i = 0; i < 4; i++) st.hire(stand, 'spear');
    const chest = stand.chest;
    for (let t = 0; t < 60 && !stand.over; t += 0.05) st.stepStand(stand, 0.05);
    expect(stand.kills).toBeGreaterThan(0);
    expect(stand.chest).toBeGreaterThan(chest);
  });

  it('is repeatable with the same seed', () => {
    const a = fresh();
    const b = fresh();
    st.hire(a, 'spear');
    st.hire(b, 'spear');
    while (!a.over) st.stepStand(a, 0.05);
    while (!b.over) st.stepStand(b, 0.05);
    expect(a.time).toBe(b.time);
    expect(a.kills).toBe(b.kills);
  });
});

describe('upgrade web in the Last Stand', () => {
  it('defender upgrades, Thick Wall and Mastery buddies', () => {
    const plain = st.createStand(1, { era: 0, wave: 5, chest: 0 });
    const s = st.createStand(1, {
      era: 0,
      wave: 5,
      chest: 0,
      units: ['spear'],
      unitMods: { spear: { dmg: 1.5, rate: 1.2, range: 1.1, mastery: true } },
      wallBonus: 0.2,
    });
    expect(s.wallMax).toBe(Math.round(plain.wallMax * 1.2));
    expect(st.defenderStats(s, 'spear').dmg).toBeCloseTo(
      st.defenderStats(plain, 'spear').dmg * 1.5,
    );
    expect(st.isUnitUnlocked(s, 'boomerang')).toBe(false);
    st.hireMasteryBuddies(s);
    expect(s.defenders).toHaveLength(1);
    expect(s.chest).toBe(STAND.minChest); // the buddy was free
  });
});
