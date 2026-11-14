import { describe, expect, it } from 'vitest';
import { ERAS } from './data/eras';
import { TOWER_IDS, towerDef } from './data/towers';
import { WEB } from './data/web';
import {
  HOME,
  WEB_NODES,
  buyNode,
  canBuyAnything,
  coinsFor,
  currentEra,
  eraNodeId,
  gateNodes,
  gateProgress,
  nodeState,
  ownedSet,
  runOptions,
  webNode,
} from './web';

const node = (id: string) => webNode(id)!;

describe('the web', () => {
  it('has unique ids and every parent is listed before its child', () => {
    const seen = new Set<string>();
    for (const n of WEB_NODES) {
      expect(seen.has(n.id)).toBe(false);
      if (n.parent) expect(seen.has(n.parent)).toBe(true);
      seen.add(n.id);
    }
  });

  it('puts every tower in its era, with empty slots up to four', () => {
    for (const id of TOWER_IDS) expect(node(`tower:${id}`).era).toBe(towerDef(id).era);
    for (let e = 0; e < ERAS.length; e++) {
      const slots = WEB_NODES.filter((n) => n.era === e && n.kind === 'tower');
      expect(slots.length).toBe(
        Math.max(WEB.slots, TOWER_IDS.filter((id) => towerDef(id).era === e).length),
      );
    }
  });

  it('keeps nodes from overlapping', () => {
    for (let i = 0; i < WEB_NODES.length; i++) {
      for (let j = i + 1; j < WEB_NODES.length; j++) {
        const a = WEB_NODES[i]!;
        const b = WEB_NODES[j]!;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r);
      }
    }
  });
});

describe('owning and buying', () => {
  it('starts with home, the Stone Age and its first tower and defender', () => {
    const owned = ownedSet([]);
    expect([...owned].sort()).toEqual([HOME, 'era:stone', 'tower:rock', 'unit:spear'].sort());
    expect(currentEra(owned)).toBe(0);
  });

  it('opens a node once the one before it is owned and you can pay', () => {
    const owned = ownedSet([]);
    const power = node('tower:rock:power');
    expect(nodeState(power, owned, power.cost)).toBe('open');
    expect(nodeState(power, owned, power.cost - 1)).toBe('dear');
    expect(nodeState(node('tower:rock:speed'), owned, 999)).toBe('locked');
    expect(nodeState(node('tower:archer'), owned, 999)).toBe('hidden');
    expect(nodeState(node('tower:stone:3'), owned, 999)).toBe('empty');
  });

  it('buys a node and takes its price', () => {
    const bought: string[] = [];
    const cost = node('camp:stone:treasure').cost;
    expect(buyNode(bought, cost + 5, 'camp:stone:treasure')).toBe(5);
    expect(bought).toEqual(['camp:stone:treasure']);
    expect(buyNode(bought, 999, 'camp:stone:treasure')).toBeNull(); // already owned
    expect(buyNode(bought, 999, 'camp:stone:wall')).toBeNull(); // not next yet
  });

  it('needs the gate done before you can Evolve', () => {
    const bought: string[] = [];
    const rich = 1e12;
    expect(nodeState(node('era:ancient'), ownedSet(bought), rich)).toBe('gated');
    for (const n of gateNodes(0)) if (!ownedSet(bought).has(n.id)) buyNode(bought, rich, n.id);
    const { done, total } = gateProgress(ownedSet(bought), 0);
    expect(done).toBe(total);
    expect(buyNode(bought, rich, eraNodeId(1))).not.toBeNull();
    const owned = ownedSet(bought);
    expect(currentEra(owned)).toBe(1);
    expect(owned.has('tower:archer')).toBe(true); // comes free with the era
    expect(owned.has('unit:boomerang')).toBe(true);
  });

  it('knows when there is something to buy', () => {
    expect(canBuyAnything([], 0)).toBe(false);
    expect(canBuyAnything([], 100)).toBe(true);
  });
});

describe('what the web does in a run', () => {
  it('collects towers, defenders and boosts', () => {
    const opts = runOptions([
      'unit:spear:power',
      'camp:stone:treasure',
      'camp:stone:arms',
      'camp:stone:lucky',
      'camp:stone:wall',
    ]);
    expect(opts.towers).toEqual(['rock']);
    expect(opts.units).toEqual(['spear']);
    expect(opts.unitMods!.spear!.dmg).toBeCloseTo(1.15);
    expect(opts.bonusDamage).toBeCloseTo(0.1);
    expect(opts.coinBonus).toBeCloseTo(0.1);
    expect(opts.wallBonus).toBeCloseTo(0.2);
  });

  it('gives the Net Thrower and Boulder Dropper some upgrades of their own', () => {
    expect(node('tower:net:sticky').name).toBe('Net Thrower: Sticky Net');
    expect(node('tower:net:sticky').cost).toBe(node('tower:rock:power').cost);
    expect(webNode('tower:net:power')).toBeUndefined();
    expect(node('unit:boulder:splash').parent).toBe('unit:boulder:speed');
    const opts = runOptions([
      'tower:net',
      'tower:net:sticky',
      'unit:boulder',
      'unit:boulder:power',
      'unit:boulder:speed',
      'unit:boulder:splash',
    ]);
    expect(opts.towerMods!.net!.hold).toBeCloseTo(0.3);
    expect(opts.unitMods!.boulder!.splash).toBeCloseTo(1.2);
  });

  it('pays more coins in later eras', () => {
    expect(coinsFor(10, 0)).toBe(10);
    expect(coinsFor(10, 2)).toBe(10 * WEB.reward[2]!);
    expect(coinsFor(10, 0, 0.1)).toBe(11);
  });
});
