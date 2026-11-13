import { describe, expect, it } from 'vitest';
import { ERAS } from './data/eras';
import { STAND } from './data/stand';
import { unitDef } from './data/units';
import * as st from './stand';

const fresh = (chest = 100, era = 0) => st.createStand(1, { era, wave: 7, chest });

describe('Last Stand defenders', () => {
  it('cost War Chest and fill the wall spots one by one', () => {
    const stand = fresh();
    const cost = unitDef('spear').cost;
    expect(st.hire(stand, 'spear')!.slot).toBe(0);
    expect(st.hire(stand, 'spear')!.slot).toBe(1);
    expect(stand.chest).toBe(100 - 2 * cost);
    expect(st.hire(stand, 'spear', 1)).toBeNull(); // taken
    expect(st.hire(stand, 'spear', 3)!.slot).toBe(3);
    expect(st.hire(stand, 'spear')!.slot).toBe(2);
    expect(st.hire(stand, 'spear')).toBeNull(); // the wall is full
  });

  it("can't be hired without enough War Chest or before their era", () => {
    const poor = fresh(0);
    expect(poor.chest).toBe(STAND.minChest); // always enough for one
    expect(st.hire(poor, 'spear')).not.toBeNull();
    expect(st.hire(poor, 'spear')).toBeNull();
    expect(st.hire(fresh(1000), 'boomerang')).toBeNull();
    expect(st.hire(fresh(1000, 1), 'boomerang')).not.toBeNull();
  });

  it('upgrade twice and sell for 70%', () => {
    const stand = fresh(1000);
    const u = st.hire(stand, 'spear')!;
    expect(st.promote(stand, u)).toBe(true);
    expect(st.promote(stand, u)).toBe(true);
    expect(st.promote(stand, u)).toBe(false);
    const before = stand.chest;
    const value = st.dismiss(stand, u);
    expect(value).toBe(Math.floor(u.spent * 0.7));
    expect(stand.chest).toBe(before + value);
    expect(stand.slots[0]).toBeNull();
  });
});

describe('the wall', () => {
  it('starts with the era wall HP and replays the wave that broke through', () => {
    const stand = fresh();
    expect(stand.wallMax).toBe(ERAS[0]!.wallHp * STAND.wallHpScale);
    expect(stand.wave).toBe(6);
  });

  it('gives you time to set up, then enemies walk in and wear it down until it falls', () => {
    const stand = fresh(0);
    stand.chest = 0;
    for (let t = 0; t < STAND.firstWaveIn - 0.5; t += 0.05) st.stepStand(stand, 0.05);
    expect(stand.enemies).toHaveLength(0);
    while (!stand.over) st.stepStand(stand, 0.05);
    expect(stand.wallHp).toBe(0);
    expect(stand.events.some((e) => e.type === 'fallen')).toBe(true);
    expect(st.hire(stand, 'spear')).toBeNull();
  });

  it('defenders stop enemies and refill the War Chest', () => {
    const stand = fresh(100);
    for (let i = 0; i < 4; i++) st.hire(stand, 'spear');
    const chest = stand.chest;
    for (let t = 0; t < 30 && !stand.over; t += 0.05) st.stepStand(stand, 0.05);
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
