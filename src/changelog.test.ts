import { describe, expect, it } from 'vitest';
import { CHANGELOG } from './changelog';

describe('CHANGELOG', () => {
  it('is newest first with unique ids', () => {
    const ids = CHANGELOG.map((u) => u.id);
    expect(ids).toEqual([...ids].sort((a, b) => b - a));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has a title, a date and notes for every update', () => {
    for (const u of CHANGELOG) {
      expect(u.title.length).toBeGreaterThan(0);
      expect(u.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(u.notes.length).toBeGreaterThan(0);
    }
  });
});
