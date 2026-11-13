import { describe, expect, it } from 'vitest';
import { defaultMeta, migrate, SAVE_VERSION } from './save';

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
    expect(m.relics).toBe(0);
    expect(m.upgrades).toEqual({});
    expect(m.version).toBe(SAVE_VERSION);
  });

  it('turns old Thick Walls levels into Strong Arms', () => {
    const m = migrate({ version: 2, upgrades: { era: 1, wall: 2 } });
    expect(m.upgrades).toEqual({ era: 1, power: 2 });
  });
});
