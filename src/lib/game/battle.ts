import {
  BATTLE_DURATION_MS,
  BUILDING_HP,
  BUILDING_LAYOUT,
  BUILDING_ORDER,
  LANE_X,
  RALLY_MS,
  SMOKE_MS,
  UNIT_ORDER,
  UNIT_STATS,
  emptyArmy,
} from "./catalog";
import type {
  Army,
  BattleAbility,
  BattleLane,
  CombatBuilding,
  CombatFrame,
  GameState,
  UnitId,
} from "./types";

export const LANE_IDS: BattleLane[] = ["left", "center", "right"];

function dist(ax: number, az: number, bx: number, bz: number) {
  return Math.hypot(ax - bx, az - bz);
}

export function createBattleFrame(defender: GameState, reserve: Army): CombatFrame {
  const buildings: CombatBuilding[] = BUILDING_ORDER.map((id) => {
    const level = defender.buildings.find((b) => b.id === id)?.level ?? 1;
    const hp = BUILDING_HP[id] * (0.75 + 0.25 * level);
    const pos = BUILDING_LAYOUT[id];
    return { id, x: pos.x, z: pos.z, hp, maxHp: hp, level };
  });
  return {
    elapsed: 0,
    buildings,
    units: [],
    effects: [],
    reserve: { ...reserve },
    losses: emptyArmy(),
    destruction: 0,
    stars: 0,
    won: false,
    rallyUntil: 0,
    smokeUntil: 0,
    finished: false,
  };
}

export function deployUnit(frame: CombatFrame, unit: UnitId, count: number, lane: BattleLane) {
  if (frame.finished) return frame;
  const n = Math.min(count, frame.reserve[unit]);
  if (n <= 0) return frame;
  const stats = UNIT_STATS[unit];
  const units = [...frame.units];
  for (let i = 0; i < n; i += 1) {
    units.push({
      id: `${unit}-${Math.round(frame.elapsed)}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      type: unit,
      lane,
      x: LANE_X[lane] + (Math.random() - 0.5) * 0.2,
      z: 2.4 + Math.random() * 0.18,
      hp: stats.hp,
      maxHp: stats.hp,
      cooldown: 180 + Math.random() * 220,
    });
  }
  return { ...frame, units, reserve: { ...frame.reserve, [unit]: frame.reserve[unit] - n } };
}

export function useAbility(frame: CombatFrame, ability: BattleAbility) {
  if (frame.finished) return frame;
  if (ability === "rally") {
    if (frame.rallyUntil !== 0) return frame;
    return { ...frame, rallyUntil: frame.elapsed + RALLY_MS };
  }
  if (frame.smokeUntil !== 0) return frame;
  return { ...frame, smokeUntil: frame.elapsed + SMOKE_MS };
}

function scoreOf(buildings: CombatBuilding[]) {
  const total = buildings.reduce((sum, b) => sum + b.maxHp, 0);
  const left = buildings.reduce((sum, b) => sum + Math.max(0, b.hp), 0);
  const destruction = total <= 0 ? 1 : 1 - left / total;
  const won = destruction >= 0.5;
  const stars = !won ? 0 : destruction >= 0.9 ? 3 : destruction >= 0.7 ? 2 : 1;
  return { destruction, won, stars };
}

export function stepBattle(frame: CombatFrame, dtMs: number): CombatFrame {
  if (frame.finished) return frame;
  const dt = Math.min(0.05, dtMs / 1000);
  const elapsed = frame.elapsed + dtMs;
  const rally = elapsed < frame.rallyUntil;
  const smoke = elapsed < frame.smokeUntil;
  const speedMul = rally ? 1.3 : 1;
  const dmgMul = rally ? 1.5 : 1;

  const buildings = frame.buildings.map((b) => ({ ...b }));
  const units = frame.units.map((u) => ({ ...u }));
  const effects = frame.effects.filter((e) => elapsed - e.at < 420);
  const losses = { ...frame.losses };

  for (const unit of units) {
    if (unit.hp <= 0) continue;
    const stats = UNIT_STATS[unit.type];
    const living = buildings.filter((b) => b.hp > 0);
    if (living.length === 0) break;
    const target = living.reduce((best, b) =>
      dist(unit.x, unit.z, b.x, b.z) < dist(unit.x, unit.z, best.x, best.z) ? b : best,
    );
    const d = dist(unit.x, unit.z, target.x, target.z);
    if (d > stats.range) {
      unit.x += ((target.x - unit.x) / d) * stats.speed * speedMul * dt;
      unit.z += ((target.z - unit.z) / d) * stats.speed * speedMul * dt;
    } else {
      unit.cooldown -= dtMs;
      if (unit.cooldown <= 0) {
        target.hp = Math.max(0, target.hp - stats.damage * dmgMul);
        unit.cooldown = stats.interval;
        effects.push({
          id: `shot-${unit.id}-${elapsed}`,
          type: "shot",
          at: elapsed,
          fromX: unit.x,
          fromZ: unit.z,
          toX: target.x,
          toZ: target.z,
        });
        if (target.hp <= 0) {
          effects.push({
            id: `down-${target.id}-${elapsed}`,
            type: "collapse",
            at: elapsed,
            fromX: target.x,
            fromZ: target.z,
            toX: target.x,
            toZ: target.z,
          });
        }
      }
    }
  }

  if (!smoke) {
    for (const building of buildings) {
      if (building.hp <= 0) continue;
      const inRange = units.filter((u) => u.hp > 0 && dist(u.x, u.z, building.x, building.z) < 2.45);
      if (inRange.length === 0) continue;
      if (Math.floor(elapsed / 260 + building.level) % 2 === 0) {
        const victim = inRange[Math.floor(elapsed / 90) % inRange.length];
        victim.hp -= 8 + building.level * 2.2;
        effects.push({
          id: `hit-${building.id}-${victim.id}-${elapsed}`,
          type: "hit",
          at: elapsed,
          fromX: building.x,
          fromZ: building.z,
          toX: victim.x,
          toZ: victim.z,
        });
      }
    }
  }

  for (const unit of units) {
    if (unit.hp <= 0) {
      const wasAlive = frame.units.find((u) => u.id === unit.id)?.hp ?? 0;
      if (wasAlive > 0) losses[unit.type] += 1;
    }
  }
  const remaining = units.filter((u) => u.hp > 0);
  const scored = scoreOf(buildings);
  const finished = elapsed >= BATTLE_DURATION_MS || scored.destruction >= 0.999;

  return {
    ...frame,
    elapsed,
    buildings,
    units: remaining,
    effects,
    losses,
    destruction: scored.destruction,
    stars: scored.stars,
    won: scored.won,
    finished,
  };
}

export function survivorsOf(frame: CombatFrame): Army {
  const alive = emptyArmy();
  for (const unit of frame.units) alive[unit.type] += 1;
  for (const id of UNIT_ORDER) alive[id] += frame.reserve[id];
  return alive;
}

export function laneLabel(lane: BattleLane) {
  if (lane === "left") return "Sinistra";
  if (lane === "right") return "Destra";
  return "Centro";
}
