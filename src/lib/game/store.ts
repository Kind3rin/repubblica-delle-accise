import { create } from "zustand";
import { OPPONENTS, SHIELD_DURATION_MS, UNIT_ORDER, emptyArmy } from "./catalog";
import { createBattleFrame, deployUnit, stepBattle, survivorsOf, useAbility } from "./battle";
import { playSfx } from "./audio";
import {
  canRaid,
  claimDaily,
  collectResources,
  createInitialState,
  getArmyPower,
  getCapacity,
  makeDiaryEvent,
  resolveIncomingRaid,
  returnArmy,
  settleTimers,
  startTraining,
  startUpgrade,
  takeArmy,
} from "./engine";
import type {
  Army,
  BattleAbility,
  BattleLane,
  BattleResult,
  BuildingId,
  CombatFrame,
  DiaryEvent,
  GameState,
  Tab,
  UnitId,
} from "./types";

const SAVE_KEY = "rda-save-v1";
const DIARY_KEY = "rda-diary-v1";
const BATTLE_KEY = "rda-battle-v1";

function loadSave(): { state: GameState | null; diary: DiaryEvent[] } {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const diaryRaw = localStorage.getItem(DIARY_KEY);
    const diary: DiaryEvent[] = diaryRaw ? JSON.parse(diaryRaw) : [];
    if (!raw) return { state: null, diary };
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || !parsed.townName) return { state: null, diary };
    const now = Date.now();
    const merged = { ...createInitialState(now, parsed.townName), ...parsed };
    if (!parsed.nextIncomingAt) merged.nextIncomingAt = now + 4 * 60 * 1000;
    return { state: merged, diary };
  } catch {
    return { state: null, diary: [] };
  }
}

function persist(state: GameState, diary: DiaryEvent[]) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    localStorage.setItem(DIARY_KEY, JSON.stringify(diary.slice(0, 40)));
  } catch {
    /* private mode */
  }
}

function persistBattle(payload: {
  battle: CombatFrame | null;
  battleTarget: string | null;
  lastResult: BattleResult | null;
}) {
  try {
    if (!payload.battle) localStorage.removeItem(BATTLE_KEY);
    else localStorage.setItem(BATTLE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode */
  }
}

function loadBattle(): {
  battle: CombatFrame;
  battleTarget: string;
  lastResult: BattleResult | null;
} | null {
  try {
    const raw = localStorage.getItem(BATTLE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      battle?: CombatFrame;
      battleTarget?: string;
      lastResult?: BattleResult | null;
    };
    if (!parsed.battle || !parsed.battleTarget) return null;
    return {
      battle: parsed.battle,
      battleTarget: parsed.battleTarget,
      lastResult: parsed.lastResult ?? null,
    };
  } catch {
    return null;
  }
}

function pushDiary(diary: DiaryEvent[], event: DiaryEvent) {
  return [event, ...diary].slice(0, 40);
}

function incomingChanged(prev: GameState, next: GameState) {
  return (
    prev.nextIncomingAt !== next.nextIncomingAt ||
    prev.euros !== next.euros ||
    prev.oil !== next.oil ||
    prev.trophies !== next.trophies ||
    prev.army.vespa !== next.army.vespa ||
    prev.shieldUntil !== next.shieldUntil
  );
}

function npcState(opponentId: string, now: number, trophies: number): GameState {
  const npc = OPPONENTS.find((o) => o.id === opponentId)!;
  const base = createInitialState(now, npc.name);
  return {
    ...base,
    trophies,
    euros: npc.euros,
    oil: npc.oil,
    army: { ...npc.army },
    buildings: base.buildings.map((b) => ({ ...b, level: npc.level })),
  };
}

function defaultRaid(army: Army): Army {
  return {
    vespa: Math.min(8, army.vespa),
    ragioniere: Math.min(2, army.ragioniere),
    autobotte: Math.min(1, army.autobotte),
  };
}

type GameStore = {
  hydrated: boolean;
  state: GameState | null;
  diary: DiaryEvent[];
  tab: Tab;
  selected: BuildingId;
  now: number;
  toast: string | null;
  error: string | null;
  battle: CombatFrame | null;
  battleTarget: string | null;
  lastResult: BattleResult | null;
  raidArmy: Army;
  hydrate: () => void;
  foundTown: (name: string) => void;
  setTab: (tab: Tab) => void;
  setSelected: (id: BuildingId) => void;
  tick: (now: number) => void;
  collect: () => void;
  daily: () => void;
  upgrade: (id: BuildingId) => void;
  train: (unit: UnitId, count: number) => void;
  setRaidCount: (unit: UnitId, count: number) => void;
  startRaid: (opponentId: string) => void;
  deploy: (unit: UnitId, count: number, lane: BattleLane) => void;
  ability: (kind: BattleAbility) => void;
  advanceBattle: (dtMs: number) => void;
  finishBattle: () => void;
  closeBattle: () => void;
  dismissToast: () => void;
};

let lastBattleWrite = 0;

export const useGame = create<GameStore>((set, get) => ({
  hydrated: true,
  state: null,
  diary: [],
  tab: "village",
  selected: "municipio",
  now: Date.now(),
  toast: null,
  error: null,
  battle: null,
  battleTarget: null,
  lastResult: null,
  raidArmy: emptyArmy(),
  hydrate: () => {
    if (get().state) return;
    const loaded = loadSave();
    if (!loaded.state) return;
    const pending = loadBattle();
    set({
      state: loaded.state,
      diary: loaded.diary,
      raidArmy: defaultRaid(loaded.state.army),
      battle: pending?.battle ?? null,
      battleTarget: pending?.battleTarget ?? null,
      lastResult: pending?.lastResult ?? null,
      tab: pending?.battle ? "raid" : "village",
    });
  },
  foundTown: (name) => {
    const trimmed = name.trim();
    if (trimmed.length < 3 || trimmed.length > 24) {
      set({ error: "Il nome del comune deve avere da 3 a 24 caratteri." });
      return;
    }
    const now = Date.now();
    const state = createInitialState(now, trimmed);
    const diary = [makeDiaryEvent("found", `Fondato il comune di ${trimmed}. Il mandato comincia.`, now)];
    persist(state, diary);
    set({
      hydrated: true,
      state,
      diary,
      error: null,
      toast: "Benvenuto, sindaco. Il tuo comune è pronto!",
      raidArmy: { vespa: 8, ragioniere: 2, autobotte: 1 },
    });
    playSfx("win");
  },
  setTab: (tab) => set({ tab }),
  setSelected: (id) => set({ selected: id, tab: "village" }),
  tick: (now) => {
    const { state, diary, battle } = get();
    if (!state) {
      set({ now });
      return;
    }
    const settled = settleTimers(state, now);
    let nextState = settled.state;
    let nextDiary = diary;
    let toast: string | null = null;
    if (settled.notes.length) {
      nextDiary = settled.notes.reduce(
        (acc, text) => pushDiary(acc, makeDiaryEvent("upgrade", text, now)),
        diary,
      );
    }
    if (!battle) {
      const incoming = resolveIncomingRaid(nextState, now);
      if (incoming) {
        nextState = incoming.state;
        nextDiary = pushDiary(nextDiary, makeDiaryEvent("defense", incoming.note, now));
        toast = incoming.note;
        playSfx(incoming.held ? "tap" : "alert");
      }
    }
    if (nextDiary !== diary || incomingChanged(state, nextState)) persist(nextState, nextDiary);
    set({
      now,
      state: nextState,
      diary: nextDiary,
      ...(toast ? { toast } : {}),
    });
  },
  collect: () => {
    const { state, diary, now } = get();
    if (!state) return;
    const settled = settleTimers(state, now).state;
    const { state: next, gained } = collectResources(settled, now);
    if (gained.euros <= 0 && gained.oil <= 0) {
      set({ toast: "Niente da riscuotere, per ora. La trivella sta pensando." });
      return;
    }
    const nextDiary = pushDiary(
      diary,
      makeDiaryEvent("collect", `Entrate riscosse: ${Math.floor(gained.euros)} € e ${Math.floor(gained.oil)} L.`, now),
    );
    persist(next, nextDiary);
    playSfx("collect");
    set({
      state: next,
      diary: nextDiary,
      toast: "Entrate riscosse. Le casse del comune ringraziano.",
      error: null,
    });
  },
  daily: () => {
    const { state, diary, now } = get();
    if (!state) return;
    try {
      const next = claimDaily(settleTimers(state, now).state, now);
      const nextDiary = pushDiary(diary, makeDiaryEvent("daily", "Fondo straordinario incassato.", now));
      persist(next, nextDiary);
      playSfx("daily");
      set({ state: next, diary: nextDiary, toast: "Fondo straordinario incassato!", error: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Non ora." });
    }
  },
  upgrade: (id) => {
    const { state, diary, now } = get();
    if (!state) return;
    try {
      const next = startUpgrade(settleTimers(state, now).state, id, now);
      const nextDiary = pushDiary(diary, makeDiaryEvent("upgrade", `Cantiere aperto.`, now));
      persist(next, nextDiary);
      playSfx("upgrade");
      set({
        state: next,
        diary: nextDiary,
        toast: "Cantiere aperto. Questa volta si finisce davvero.",
        error: null,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Cantiere rifiutato." });
    }
  },
  train: (unit, count) => {
    const { state, diary, now } = get();
    if (!state) return;
    try {
      const next = startTraining(settleTimers(state, now).state, unit, count, now);
      const nextDiary = pushDiary(diary, makeDiaryEvent("train", `Reclutamento avviato: ${count} unità.`, now));
      persist(next, nextDiary);
      playSfx("train");
      set({
        state: next,
        diary: nextDiary,
        toast: "Reclutamento avviato. La burocrazia è in moto.",
        error: null,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Reclutamento rifiutato." });
    }
  },
  setRaidCount: (unit, count) => {
    const { state, raidArmy } = get();
    if (!state) return;
    const clamped = Math.max(0, Math.min(state.army[unit], Math.floor(count)));
    set({ raidArmy: { ...raidArmy, [unit]: clamped } });
  },
  startRaid: (opponentId) => {
    const { state, now, raidArmy, battle } = get();
    if (!state || battle) return;
    try {
      if (!canRaid(state, now)) throw new Error("Le truppe sono ancora al rifornimento.");
      const settled = settleTimers(state, now).state;
      const remaining = takeArmy(settled, raidArmy);
      const opponent = OPPONENTS.find((o) => o.id === opponentId);
      if (!opponent) throw new Error("Avamposto sconosciuto.");
      const trophies = settled.npcTrophies[opponentId] ?? opponent.level * 75;
      const defender = npcState(opponentId, now, trophies);
      const nextState = { ...settled, army: remaining, lastAttackAt: now };
      const frame = createBattleFrame(defender, { ...raidArmy });
      persist(nextState, get().diary);
      persistBattle({ battle: frame, battleTarget: opponentId, lastResult: null });
      lastBattleWrite = Date.now();
      playSfx("raid");
      set({
        state: nextState,
        battle: frame,
        battleTarget: opponentId,
        lastResult: null,
        error: null,
        tab: "raid",
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Raid rifiutato." });
    }
  },
  deploy: (unit, count, lane) => {
    const { battle, battleTarget, lastResult } = get();
    if (!battle) return;
    const next = deployUnit(battle, unit, count, lane);
    persistBattle({ battle: next, battleTarget, lastResult });
    playSfx("deploy");
    set({ battle: next });
  },
  ability: (kind) => {
    const { battle, battleTarget, lastResult } = get();
    if (!battle) return;
    const next = useAbility(battle, kind);
    persistBattle({ battle: next, battleTarget, lastResult });
    playSfx("tap");
    set({ battle: next });
  },
  advanceBattle: (dtMs) => {
    const { battle, battleTarget, lastResult } = get();
    if (!battle || battle.finished) return;
    const next = stepBattle(battle, dtMs);
    set({ battle: next });
    const t = Date.now();
    if (next.finished || t - lastBattleWrite > 900) {
      lastBattleWrite = t;
      persistBattle({ battle: next, battleTarget, lastResult });
    }
  },
  finishBattle: () => {
    const { state, battle, battleTarget, diary, now, lastResult } = get();
    if (!state || !battle || !battleTarget || lastResult) return;
    const opponent = OPPONENTS.find((o) => o.id === battleTarget);
    if (!opponent) return;
    const lootEuros = Math.floor(opponent.euros * battle.destruction * 0.28);
    const lootOil = Math.floor(opponent.oil * battle.destruction * 0.28);
    const npcTrophies = state.npcTrophies[battleTarget] ?? opponent.level * 75;
    const trophyDelta = battle.won
      ? Math.max(8, Math.round(18 + (npcTrophies - state.trophies) / 25))
      : -Math.max(6, Math.round(12 + (state.trophies - npcTrophies) / 40));
    const survivors = survivorsOf(battle);
    const cap = getCapacity(state);
    const sent = UNIT_ORDER.reduce((acc, id) => {
      acc[id] = survivors[id] + battle.losses[id];
      return acc;
    }, emptyArmy());
    const shieldUntil = battle.won ? now + SHIELD_DURATION_MS : state.shieldUntil;
    const next: GameState = {
      ...state,
      army: returnArmy(state.army, survivors),
      euros: Math.min(cap.euros, state.euros + lootEuros),
      oil: Math.min(cap.oil, state.oil + lootOil),
      trophies: Math.max(0, state.trophies + trophyDelta),
      totalRaids: state.totalRaids + 1,
      wins: state.wins + (battle.won ? 1 : 0),
      shieldUntil,
      nextIncomingAt: battle.won
        ? Math.max(state.nextIncomingAt, shieldUntil + 60_000)
        : state.nextIncomingAt,
      npcTrophies: {
        ...state.npcTrophies,
        [battleTarget]: Math.max(20, npcTrophies - (battle.won ? trophyDelta : 0)),
      },
    };
    const result: BattleResult = {
      id: crypto.randomUUID(),
      attackerName: state.townName,
      defenderName: opponent.name,
      won: battle.won,
      stars: battle.stars,
      destruction: battle.destruction,
      lootEuros,
      lootOil,
      trophyDelta,
      losses: battle.losses,
      power: getArmyPower(sent),
      defense: opponent.defense,
      createdAt: now,
    };
    const nextDiary = pushDiary(
      diary,
      makeDiaryEvent(
        "raid",
        battle.won
          ? `Raid vinto contro ${opponent.name}. ${result.stars} stelle. Scudo 10 minuti.`
          : `Raid respinto da ${opponent.name}.`,
        now,
      ),
    );
    const finished = { ...battle, finished: true };
    persist(next, nextDiary);
    persistBattle({ battle: finished, battleTarget, lastResult: result });
    playSfx(battle.won ? "win" : "lose");
    set({
      state: next,
      diary: nextDiary,
      battle: finished,
      lastResult: result,
      toast: null,
      raidArmy: defaultRaid(next.army),
    });
  },
  closeBattle: () => {
    persistBattle({ battle: null, battleTarget: null, lastResult: null });
    set({
      battle: null,
      battleTarget: null,
      toast: get().lastResult?.won
        ? "Avamposto piegato. Le accise applaudono."
        : "Ritirata ordinata. Quasi.",
    });
  },
  dismissToast: () => set({ toast: null, error: null }),
}));
