export type BuildingId =
  | "municipio"
  | "trivella"
  | "tesoreria"
  | "caserma"
  | "torre"
  | "deposito";

export type UnitId = "vespa" | "ragioniere" | "autobotte";
export type Army = Record<UnitId, number>;
export type Tab = "village" | "army" | "raid" | "board" | "diary";
export type BattleLane = "left" | "center" | "right";
export type BattleAbility = "rally" | "smoke";

export interface Building {
  id: BuildingId;
  level: number;
  upgradeEndsAt: number | null;
}

export interface Training {
  unit: UnitId;
  count: number;
  endsAt: number;
}

export interface GameState {
  version: number;
  townName: string;
  euros: number;
  oil: number;
  trophies: number;
  buildings: Building[];
  army: Army;
  training: Training | null;
  lastCollectedAt: number;
  lastDailyAt: number;
  lastAttackAt: number;
  shieldUntil: number;
  nextIncomingAt: number;
  totalRaids: number;
  wins: number;
  createdAt: number;
  productionRemainder: { euros: number; oil: number };
  npcTrophies: Record<string, number>;
}

export interface BuildingDef {
  id: BuildingId;
  name: string;
  short: string;
  description: string;
  flavor: string;
  costEuros: number;
  costOil: number;
  duration: number;
  maxLevel: number;
}

export interface UnitDef {
  id: UnitId;
  name: string;
  short: string;
  description: string;
  costEuros: number;
  costOil: number;
  power: number;
  duration: number;
  requiredLevel: number;
}

export interface Opponent {
  id: string;
  name: string;
  blurb: string;
  level: number;
  euros: number;
  oil: number;
  defense: number;
  army: Army;
}

export interface DiaryEvent {
  id: string;
  at: number;
  kind: "collect" | "upgrade" | "train" | "raid" | "daily" | "found" | "defense";
  text: string;
}

export interface BattleResult {
  id: string;
  attackerName: string;
  defenderName: string;
  won: boolean;
  stars: number;
  destruction: number;
  lootEuros: number;
  lootOil: number;
  trophyDelta: number;
  losses: Army;
  power: number;
  defense: number;
  createdAt: number;
}

export interface CombatBuilding {
  id: BuildingId;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  level: number;
}

export interface CombatUnit {
  id: string;
  type: UnitId;
  lane: BattleLane;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  cooldown: number;
}

export interface CombatEffect {
  id: string;
  type: "shot" | "hit" | "collapse";
  at: number;
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
}

export interface CombatFrame {
  elapsed: number;
  buildings: CombatBuilding[];
  units: CombatUnit[];
  effects: CombatEffect[];
  reserve: Army;
  losses: Army;
  destruction: number;
  stars: number;
  won: boolean;
  rallyUntil: number;
  smokeUntil: number;
  finished: boolean;
}
