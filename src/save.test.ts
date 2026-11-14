import { describe, expect, it } from 'vitest';
import { defaultMeta, migrate, resetMeta, SAVE_VERSION } from './save';

describe('migrate', () => {
  it('returns defaults for junk', () => {
    expect(migrate(null)).toEqual(defaultMeta());
    expect(migrate('nope')).toEqual(defaultMeta());
  });

  it('keeps known fields and fills in missing ones', () => {
    const m = migrate({
      version: 1,
      votes: { topdown: 1, side: 2 },
      best: { wave: 9 },
      ideas: [{ name: 'A', text: 'lava tower', date: 'x' }],
    });
    expect(m).not.toHaveProperty('votes');
    expect(m.best).toEqual({ wave: 9, era: 0, chest: 0 });
    expect(m.ideas).toHaveLength(1);
    expect(m.coins).toBe(0);
    expect(m.web).toEqual([]);
    expect(m.version).toBe(SAVE_VERSION);
  });

  it('turns Relics into copper, keeps reached eras and refunds old upgrades', () => {
    const m = migrate({ version: 3, relics: 7, upgrades: { era: 2, gold: 2, power: 1 } });
    expect(m.coins).toBe(7 + (3 + 6) + 3);
    expect(m.web).toEqual(['era:ancient', 'era:medieval']);
    expect(m).not.toHaveProperty('relics');
    expect(m).not.toHaveProperty('upgrades');
  });

  it('refunds v2 Thick Walls too', () => {
    expect(migrate({ version: 2, upgrades: { wall: 2 } }).coins).toBe(9);
  });

  it('keeps a v4 save as it is', () => {
    const m = migrate({ version: 4, coins: 55, web: ['era:ancient', 42] });
    expect(m.coins).toBe(55);
    expect(m.web).toEqual(['era:ancient']);
    expect(m.seenUpdate).toBe(0);
  });
});

describe('resetMeta', () => {
  it('starts over but keeps ideas, the name and dev mode', () => {
    const old = migrate({
      coins: 500,
      web: ['era:ancient'],
      dev: true,
      devGold: true,
      lastName: 'Sam',
    });
    old.ideas.push({ name: 'Sam', text: 'lava tower', date: 'x' });
    const fresh = resetMeta(old);
    expect(fresh.coins).toBe(0);
    expect(fresh.web).toEqual([]);
    expect(fresh.devGold).toBe(false);
    expect(fresh.dev).toBe(true);
    expect(fresh.lastName).toBe('Sam');
    expect(fresh.ideas).toHaveLength(1);
  });
});
