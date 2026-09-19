import {
  BUILDING_ORDER,
  BUILDINGS,
  DAILY_COOLDOWN_MS,
  DAILY_EUROS,
  DAILY_OIL,
  MAX_ACCUMULATION_MS,
  MAX_ARMY,
  OPPONENTS,
  RAID_COOLDOWN_MS,
  SAVE_VERSION,
  UNITS,
  UNIT_ORDER,
  emptyArmy,
} from "./catalog";
import type {
  Army,
  BuildingId,
  DiaryEvent,
  GameState,
  UnitId,
} from "./types";

export function levelOf(state: GameState, id: BuildingId) {
  return state.buildings.find((b) => b.id === id)?.level ?? 1;
}

export function getCapacity(state: GameState) {
  return {
    euros: 4200 + (levelOf(state, "deposito") - 1) * 1800 + (levelOf(state, "municipio") - 1) * 400,
    oil: 2400 + (levelOf(state, "deposito") - 1) * 1100 + (levelOf(state, "municipio") - 1) * 200,
  };
}

/** Production per minute. */
export function getProduction(state: GameState) {
  return {
    euros: 40 + (levelOf(state, "tesoreria") - 1) * 24 + 4 * levelOf(state, "municipio"),
    oil: 24 + (levelOf(state, "trivella") - 1) * 18 + 2 * levelOf(state, "municipio"),
  };
}

export function getDefense(state: GameState) {
  const municipio = levelOf(state, "municipio");
  const torre = levelOf(state, "torre");
  return Math.round(
    28 + 18 * municipio + torre ** 1.35 * 36 + 6 * levelOf(state, "deposito") + 4 * levelOf(state, "caserma"),
  );
}

export function getArmyPower(army: Army) {
  return UNIT_ORDER.reduce((sum, id) => sum + army[id] * UNITS[id].power, 0);
}

export function armyCount(army: Army) {
  return UNIT_ORDER.reduce((sum, id) => sum + army[id], 0);
}

export function getPendingResources(state: GameState, now: number) {
  const elapsed = Math.max(0, Math.min(MAX_ACCUMULATION_MS, now - state.lastCollectedAt));
  const prod = getProduction(state);
  const eurosAccum = state.productionRemainder.euros + prod.euros * elapsed;
  const oilAccum = state.productionRemainder.oil + prod.oil * elapsed;
  return {
    euros: Math.floor(eurosAccum / 60_000),
    oil: Math.floor(oilAccum / 60_000),
    remainder: { euros: eurosAccum % 60_000, oil: oilAccum % 60_000 },
  };
}

export function getUpgradeCost(state: GameState, id: BuildingId) {
  const def = BUILDINGS[id];
  const level = levelOf(state, id);
  const t = 1.65 ** (level - 1);
  return {
    euros: Math.round(def.costEuros * t),
    oil: Math.round(def.costOil * t),
    duration: Math.min(120, def.duration * level),
  };
}

export function maxBuildLevel(state: GameState, id: BuildingId) {
  if (id === "municipio") return BUILDINGS.municipio.maxLevel;
  return Math.min(BUILDINGS[id].maxLevel, levelOf(state, "municipio"));
}

export function getTrainingDuration(state: GameState, unit: UnitId, count: number) {
  const base = UNITS[unit].duration * count;
  const speed = 1 - 0.1 * (levelOf(state, "caserma") - 1);
  return Math.round(Math.max(4, base * speed) * 1000);
}

export function createInitialState(now: number, townName: string): GameState {
  return {
    version: SAVE_VERSION,
    townName,
    euros: 1600,
    oil: 800,
    trophies: 100,
    buildings: BUILDING_ORDER.map((id) => ({ id, level: 1, upgradeEndsAt: null })),
    army: { vespa: 8, ragioniere: 2, autobotte: 1 },
    training: null,
    lastCollectedAt: now,
    lastDailyAt: now - DAILY_COOLDOWN_MS,
    lastAttackAt: now - RAID_COOLDOWN_MS,
    shieldUntil: 0,
    nextIncomingAt: now + 4 * 60 * 1000,
    totalRaids: 0,
    wins: 0,
    createdAt: now,
    productionRemainder: { euros: 0, oil: 0 },
    npcTrophies: {},
  };
}

export function settleTimers(state: GameState, now: number): { state: GameState; notes: string[] } {
  const notes: string[] = [];
  const buildings = state.buildings.map((b) => {
    if (b.upgradeEndsAt && b.upgradeEndsAt <= now) {
      notes.push(`${BUILDINGS[b.id].name} è salito al livello ${b.level + 1}.`);
      return { ...b, level: b.level + 1, upgradeEndsAt: null };
    }
    return b;
  });
  let army = { ...state.army };
  let training = state.training;
  if (training && training.endsAt <= now) {
    army = { ...army, [training.unit]: army[training.unit] + training.count };
    notes.push(
      `${training.count} ${UNITS[training.unit].name}${training.count === 1 ? "" : " pronte"}.`,
    );
    training = null;
  }
  return { state: { ...state, buildings, army, training }, notes };
}

export function collectResources(state: GameState, now: number) {
  const pending = getPendingResources(state, now);
  const cap = getCapacity(state);
  const euros = Math.min(cap.euros, state.euros + pending.euros);
  const oil = Math.min(cap.oil, state.oil + pending.oil);
  const gained = { euros: euros - state.euros, oil: oil - state.oil };
  return {
    state: {
      ...state,
      euros,
      oil,
      lastCollectedAt: now,
      productionRemainder: pending.remainder,
    },
    gained,
  };
}

export function claimDaily(state: GameState, now: number) {
  if (now - state.lastDailyAt < DAILY_COOLDOWN_MS) {
    throw new Error("Il fondo straordinario è già stato incassato.");
  }
  const cap = getCapacity(state);
  return {
    ...state,
    euros: Math.min(cap.euros, state.euros + DAILY_EUROS),
    oil: Math.min(cap.oil, state.oil + DAILY_OIL),
    lastDailyAt: now,
  };
}

export function startUpgrade(state: GameState, id: BuildingId, now: number) {
  if (state.buildings.some((b) => b.upgradeEndsAt && b.upgradeEndsAt > now)) {
    throw new Error("C’è già un cantiere aperto. Una pratica alla volta.");
  }
  const building = state.buildings.find((b) => b.id === id);
  if (!building) throw new Error("Edificio sconosciuto.");
  if (building.level >= maxBuildLevel(state, id)) {
    throw new Error(
      id === "municipio"
        ? "Il municipio è già al livello massimo."
        : "Prima va potenziato il Palazzo delle Accise.",
    );
  }
  const cost = getUpgradeCost(state, id);
  if (state.euros < cost.euros || state.oil < cost.oil) {
    throw new Error("Risorse insufficienti per aprire il cantiere.");
  }
  return {
    ...state,
    euros: state.euros - cost.euros,
    oil: state.oil - cost.oil,
    buildings: state.buildings.map((b) =>
      b.id === id ? { ...b, upgradeEndsAt: now + cost.duration * 1000 } : b,
    ),
  };
}

export function startTraining(state: GameState, unit: UnitId, count: number, now: number) {
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new Error("Puoi addestrare da 1 a 20 unità per volta.");
  }
  if (state.training && state.training.endsAt > now) {
    throw new Error("La caserma ha già una pratica in corso.");
  }
  if (levelOf(state, "caserma") < UNITS[unit].requiredLevel) {
    throw new Error("Potenzia la caserma per sbloccare questo mezzo.");
  }
  const queued = armyCount(state.army) + count;
  if (queued > MAX_ARMY) {
    throw new Error(`L’esercito può contenere al massimo ${MAX_ARMY} unità.`);
  }
  const costEuros = UNITS[unit].costEuros * count;
  const costOil = UNITS[unit].costOil * count;
  if (state.euros < costEuros || state.oil < costOil) {
    throw new Error("Non basta il tesoro per questo reclutamento.");
  }
  return {
    ...state,
    euros: state.euros - costEuros,
    oil: state.oil - costOil,
    training: { unit, count, endsAt: now + getTrainingDuration(state, unit, count) },
  };
}

export function canRaid(state: GameState, now: number) {
  return now - state.lastAttackAt >= RAID_COOLDOWN_MS;
}

export function takeArmy(state: GameState, raid: Army) {
  const next = { ...state.army };
  for (const id of UNIT_ORDER) {
    if (raid[id] < 0 || raid[id] > next[id]) {
      throw new Error("Non hai abbastanza truppe pronte.");
    }
    next[id] -= raid[id];
  }
  if (armyCount(raid) === 0) throw new Error("Scegli almeno una truppa.");
  if (armyCount(raid) > MAX_ARMY) throw new Error("Troppe truppe per un solo raid.");
  return next;
}

export function returnArmy(army: Army, survivors: Army): Army {
  const next = { ...army };
  for (const id of UNIT_ORDER) next[id] += survivors[id];
  return next;
}

export function makeDiaryEvent(
  kind: DiaryEvent["kind"],
  text: string,
  at: number,
): DiaryEvent {
  return { id: crypto.randomUUID(), at, kind, text };
}

export function townLevel(state: GameState) {
  return Math.max(...state.buildings.map((b) => b.level));
}

export function resolveIncomingRaid(
  state: GameState,
  now: number,
): { state: GameState; note: string; held: boolean } | null {
  if (now < state.shieldUntil) return null;
  const due = state.nextIncomingAt || state.createdAt + 4 * 60 * 1000;
  if (now < due) return null;
  const level = townLevel(state);
  const pool = OPPONENTS.filter((npc) => npc.level <= level + 1);
  const npc = pool[Math.floor(now / 997) % pool.length] ?? OPPONENTS[0];
  const power = getArmyPower(state.army) + getDefense(state);
  const attack = npc.defense + getArmyPower(npc.army);
  const held = power >= attack * 0.82;
  const nextIncomingAt = now + 3 * 60 * 1000 + (now % 5) * 60 * 1000;
  if (held) {
    return {
      held: true,
      note: `${npc.name} ha tentato un sopralluogo. Respinto. +6 prestigio.`,
      state: { ...state, trophies: state.trophies + 6, nextIncomingAt },
    };
  }
  const stolenEuros = Math.min(state.euros, Math.round(npc.euros * 0.08));
  const stolenOil = Math.min(state.oil, Math.round(npc.oil * 0.08));
  const vespaLoss = state.army.vespa > 0 ? 1 : 0;
  return {
    held: false,
    note: `${npc.name} ha fatto un blitz. −${stolenEuros} €, −${stolenOil} L.`,
    state: {
      ...state,
      euros: state.euros - stolenEuros,
      oil: state.oil - stolenOil,
      trophies: Math.max(0, state.trophies - 8),
      army: { ...state.army, vespa: state.army.vespa - vespaLoss },
      nextIncomingAt,
    },
  };
}
