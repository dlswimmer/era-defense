import { describe, expect, it } from 'vitest';
import { defaultMeta, migrate, SAVE_VERSION } from './save';

describe('migrate', () => {
  it('returns defaults for junk', () => {
    expect(migrate(null)).toEqual(defaultMeta());
    expect(migrate('nope')).toEqual(defaultMeta());
  });

  it('keeps known fields and fills in missing ones', () => {
    const m = migrate({ best: { wave: 9 }, ideas: [{ name: 'A', text: 'lava tower', date: 'x' }] });
    expect(m.best).toEqual({ wave: 9, era: 0, chest: 0 });
    expect(m.ideas).toHaveLength(1);
    expect(m.votes).toEqual({ topdown: 0, side: 0 });
    expect(m.version).toBe(SAVE_VERSION);
  });
});
