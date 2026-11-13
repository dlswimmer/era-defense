// The upgrade web (spent between runs with coins). Home is in the middle and the eras sit in a
// ring around it, Stone Age at the top, going clockwise; each era opens after the one before.
// Each era owns a slice of the web: its towers fan out to the left, its wall defenders to the
// right, and a line of Camp upgrades runs straight out down the middle. Every tower and defender
// has its own line of upgrades running outward. A node can be bought once the node it hangs off
// is owned. Evolving into the next era also needs every tower and defender of your era unlocked
// with its first upgrades (the "gate"), which is what keeps players in an era for a while.
import { ERAS } from './data/eras';
import { TOWER_IDS, towerDef, type TowerId } from './data/towers';
import { UNIT_IDS, unitDef, type UnitId } from './data/units';
import { CAMP, STEPS, WEB, campEffect, type CampId, type StepEffect } from './data/web';

export type NodeKind = 'home' | 'era' | 'tower' | 'unit' | 'step' | 'camp';

export interface WebNode {
  id: string;
  kind: NodeKind;
  /** The era whose slice this node is in (-1 for home). */
  era: number;
  /** The node this one hangs off (toward the middle); null for home. */
  parent: string | null;
  name: string;
  emoji: string;
  /** Price in copper; 0 for nodes that come free with their parent. */
  cost: number;
  /** Position in web units, home at (0, 0), y down. */
  x: number;
  y: number;
  /** Size of the circle, in web units. */
  r: number;
  /** Must be owned before the next era can be bought. */
  gate?: boolean;
  /** An empty tower or defender slot the kids haven't picked yet. Can't be bought. */
  empty?: boolean;
  tower?: TowerId;
  unit?: UnitId;
  /** A tower or defender upgrade: which one, and what it does. */
  step?: { owner: TowerId | UnitId; side: 'tower' | 'unit'; effect: StepEffect };
  camp?: CampId;
  by?: string;
}

export const HOME = 'home';
const RING = 260; // eras
const CAMP_START = 360;
const CAMP_GAP = 80;
const SLOTS_R = 480; // towers and defenders
const STEP_START = 550;
const STEP_GAP = 64;
const DEG = Math.PI / 180;

export const eraNodeId = (era: number) => `era:${ERAS[era]!.id}`;

function buildWeb(): WebNode[] {
  const nodes: WebNode[] = [
    {
      id: HOME,
      kind: 'home',
      era: -1,
      parent: null,
      name: 'Home',
      emoji: '🏕️',
      cost: 0,
      x: 0,
      y: 0,
      r: 46,
    },
  ];
  const at = (r: number, a: number) => ({
    x: Math.round(Math.cos(a) * r),
    y: Math.round(Math.sin(a) * r),
  });

  ERAS.forEach((era, e) => {
    const a = -Math.PI / 2 + (e * Math.PI * 2) / ERAS.length;
    const scale = WEB.price[e] ?? 1;
    const eraId = eraNodeId(e);
    nodes.push({
      id: eraId,
      kind: 'era',
      era: e,
      parent: e === 0 ? HOME : eraNodeId(e - 1),
      name: era.name,
      emoji: era.base,
      cost: e === 0 ? 0 : WEB.evolve * (WEB.price[e - 1] ?? 1),
      ...at(RING, a),
      r: 34,
    });

    const sides = [
      { side: 'tower' as const, dir: -1, ids: TOWER_IDS.filter((id) => towerDef(id).era === e) },
      { side: 'unit' as const, dir: 1, ids: UNIT_IDS.filter((id) => unitDef(id).era === e) },
    ];
    for (const { side, dir, ids } of sides) {
      let parent = eraId;
      for (let k = 0; k < Math.max(WEB.slots, ids.length); k++) {
        const angle = a + dir * (9 + 6 * k) * DEG;
        const id = ids[k];
        const def = id
          ? side === 'tower'
            ? towerDef(id as TowerId)
            : unitDef(id as UnitId)
          : null;
        const nodeId = id ? `${side}:${id}` : `${side}:${era.id}:${k + 1}`;
        nodes.push({
          id: nodeId,
          kind: side,
          era: e,
          parent,
          name: def ? def.name : side === 'tower' ? 'New tower' : 'New defender',
          emoji: def ? def.emoji : '❔',
          cost: (WEB.unlock[k] ?? WEB.unlock[WEB.unlock.length - 1]!) * scale,
          ...at(SLOTS_R, angle),
          r: 18,
          gate: !!def,
          empty: !def,
          ...(def && side === 'tower' ? { tower: id as TowerId } : {}),
          ...(def && side === 'unit' ? { unit: id as UnitId } : {}),
          ...(def?.by ? { by: def.by } : {}),
        });
        if (def) {
          let stepParent = nodeId;
          STEPS.forEach((s, j) => {
            const stepId = `${nodeId}:${s.id}`;
            nodes.push({
              id: stepId,
              kind: 'step',
              era: e,
              parent: stepParent,
              name: `${def.name}: ${s.name}`,
              emoji: s.emoji,
              cost: s.cost * scale,
              ...at(STEP_START + STEP_GAP * j, angle),
              r: s.effect.mastery ? 15 : 12,
              gate: j < (WEB.gateUpgrades[e] ?? 2),
              step: { owner: id as TowerId | UnitId, side, effect: s.effect },
              ...(s.by ? { by: s.by } : {}),
            });
            stepParent = stepId;
          });
        }
        parent = nodeId;
      }
    }

    let parent = eraId;
    CAMP.forEach((c, j) => {
      const id = `camp:${era.id}:${c.id}`;
      nodes.push({
        id,
        kind: 'camp',
        era: e,
        parent,
        name: c.name,
        emoji: c.emoji,
        cost: c.cost * scale,
        ...at(CAMP_START + CAMP_GAP * j, a),
        r: 15,
        camp: c.id,
        ...(c.by ? { by: c.by } : {}),
      });
      parent = id;
    });
  });
  return nodes;
}

export const WEB_NODES: WebNode[] = buildWeb();
const BY_ID = new Map(WEB_NODES.map((n) => [n.id, n]));
export const webNode = (id: string): WebNode | undefined => BY_ID.get(id);

// ---------- What the player owns ----------

/**
 * Everything owned, from the ids the player bought. Home, the Stone Age and anything free
 * (an era's first tower and defender) come along with their parent.
 */
export function ownedSet(bought: Iterable<string>): Set<string> {
  const owned = new Set<string>([HOME, eraNodeId(0)]);
  for (const id of bought) if (BY_ID.has(id)) owned.add(id);
  // Nodes are listed parent-first, so one pass picks up free nodes (and chains of them).
  for (const n of WEB_NODES) {
    if (n.cost === 0 && !n.empty && n.parent && owned.has(n.parent)) owned.add(n.id);
  }
  return owned;
}

/** The newest era you have reached: runs start here. */
export function currentEra(owned: Set<string>): number {
  let era = 0;
  for (let e = 1; e < ERAS.length; e++) if (owned.has(eraNodeId(e))) era = e;
  return era;
}

/** The nodes that must be owned before evolving out of `era`. */
export const gateNodes = (era: number) => WEB_NODES.filter((n) => n.era === era && n.gate);

export function gateProgress(owned: Set<string>, era: number): { done: number; total: number } {
  const nodes = gateNodes(era);
  return { done: nodes.filter((n) => owned.has(n.id)).length, total: nodes.length };
}

export type NodeState =
  | 'owned'
  /** In an era you haven't reached: drawn as a faint dot. */
  | 'hidden'
  /** The node it hangs off isn't owned yet. */
  | 'locked'
  /** An empty slot waiting for the kids' pick. */
  | 'empty'
  /** The next era, but your era's gate isn't done yet. */
  | 'gated'
  /** Can be bought, but you need more coins. */
  | 'dear'
  /** Can be bought right now. */
  | 'open';

export function nodeState(node: WebNode, owned: Set<string>, coins: number): NodeState {
  if (owned.has(node.id)) return 'owned';
  if (node.kind !== 'era' && node.era >= 0 && !owned.has(eraNodeId(node.era))) return 'hidden';
  if (node.empty) return 'empty';
  if (node.parent && !owned.has(node.parent)) return 'locked';
  if (node.kind === 'era') {
    const { done, total } = gateProgress(owned, node.era - 1);
    if (done < total) return 'gated';
  }
  return coins >= node.cost ? 'open' : 'dear';
}

/** Buys a node if it's open. Returns the coins left, or null if it can't be bought. */
export function buyNode(bought: string[], coins: number, id: string): number | null {
  const node = BY_ID.get(id);
  if (!node || nodeState(node, ownedSet(bought), coins) !== 'open') return null;
  bought.push(id);
  return coins - node.cost;
}

/** Is there anything the player could buy right now? */
export function canBuyAnything(bought: string[], coins: number): boolean {
  const owned = ownedSet(bought);
  return WEB_NODES.some((n) => nodeState(n, owned, coins) === 'open');
}

// ---------- What it does in a run ----------

export interface Mods {
  dmg: number; // damage ×
  rate: number; // attack speed ×
  range: number; // range ×
  mastery: boolean;
}

export const NO_MODS: Mods = { dmg: 1, rate: 1, range: 1, mastery: false };

export interface RunOptions {
  era: number;
  bonusGold: number;
  bonusDamage: number; // 0.1 = +10% damage for everything
  /** Towers you can build (unset: every tower up to your era). */
  towers?: TowerId[];
  /** Defenders you can hire (unset: every defender up to your era). */
  units?: UnitId[];
  towerMods?: Partial<Record<TowerId, Mods>>;
  unitMods?: Partial<Record<UnitId, Mods>>;
  /** + share of the Last Stand wall's HP. */
  wallBonus: number;
  /** + share of coins from the run. */
  coinBonus: number;
}

export function runOptions(bought: Iterable<string>): RunOptions {
  const owned = ownedSet(bought);
  const era = currentEra(owned);
  const opts: RunOptions = {
    era,
    bonusGold: 0,
    bonusDamage: 0,
    towers: [],
    units: [],
    towerMods: {},
    unitMods: {},
    wallBonus: 0,
    coinBonus: 0,
  };
  for (const n of WEB_NODES) {
    if (!owned.has(n.id)) continue;
    if (n.tower) opts.towers!.push(n.tower);
    if (n.unit) opts.units!.push(n.unit);
    if (n.step) {
      const table = (n.step.side === 'tower' ? opts.towerMods! : opts.unitMods!) as Record<
        string,
        Mods
      >;
      const m = (table[n.step.owner] ??= { ...NO_MODS });
      const fx = n.step.effect;
      m.dmg += fx.dmg ?? 0;
      m.rate += fx.rate ?? 0;
      m.range += fx.range ?? 0;
      if (fx.mastery) m.mastery = true;
    }
    if (n.camp === 'treasure')
      opts.bonusGold += Math.round(ERAS[n.era]!.startGold * campEffect.treasure);
    if (n.camp === 'arms') opts.bonusDamage += campEffect.arms;
    if (n.camp === 'lucky') opts.coinBonus += campEffect.lucky;
    if (n.camp === 'wall') opts.wallBonus += campEffect.wall;
  }
  return opts;
}

/**
 * Coins for a run: 1 per wave reached and 2 per boss stopped (in each phase), times the
 * era's scale and any Lucky Find bonus.
 */
export function coinsFor(points: number, era: number, coinBonus = 0): number {
  return Math.round(points * (WEB.reward[era] ?? 1) * (1 + coinBonus));
}
