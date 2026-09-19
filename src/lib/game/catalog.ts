import type { Army, BuildingDef, BuildingId, Opponent, UnitDef, UnitId } from "./types";

export const SAVE_VERSION = 1;
export const MAX_ARMY = 50;
export const MAX_ACCUMULATION_MS = 8 * 60 * 60 * 1000;
export const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const RAID_COOLDOWN_MS = 20 * 1000;
export const SHIELD_DURATION_MS = 10 * 60 * 1000;
export const DAILY_EUROS = 500;
export const DAILY_OIL = 180;
export const BATTLE_DURATION_MS = 35_000;
export const RALLY_MS = 6_000;
export const SMOKE_MS = 5_000;

export const BUILDING_ORDER: BuildingId[] = [
  "municipio",
  "trivella",
  "tesoreria",
  "caserma",
  "torre",
  "deposito",
];

export const UNIT_ORDER: UnitId[] = ["vespa", "ragioniere", "autobotte"];

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  municipio: {
    id: "municipio",
    name: "Palazzo delle Accise",
    short: "Municipio",
    description: "Sblocca nuovi livelli per tutto il borgo.",
    flavor: "La burocrazia non dorme. Al massimo fa pausa.",
    costEuros: 650,
    costOil: 250,
    duration: 30,
    maxLevel: 5,
  },
  trivella: {
    id: "trivella",
    name: "Trivella Comunale",
    short: "Trivella",
    description: "Produce petrolio, anche durante la tua assenza.",
    flavor: "Sotto il prato c’è un piccolo emendamento.",
    costEuros: 340,
    costOil: 200,
    duration: 20,
    maxLevel: 5,
  },
  tesoreria: {
    id: "tesoreria",
    name: "Ufficio Rincari",
    short: "Tesoreria",
    description: "Incassa euro con ammirevole puntualità.",
    flavor: "Una monetina oggi, una manovrina domani.",
    costEuros: 380,
    costOil: 180,
    duration: 20,
    maxLevel: 5,
  },
  caserma: {
    id: "caserma",
    name: "Caserma del Pieno",
    short: "Caserma",
    description: "Addestra la tua squadra e riduce i tempi di preparazione.",
    flavor: "Pronti a partire. Prima però lo scontrino.",
    costEuros: 460,
    costOil: 220,
    duration: 25,
    maxLevel: 5,
  },
  torre: {
    id: "torre",
    name: "Torre del Pedaggio",
    short: "Torre",
    description: "Difende il borgo e scoraggia i raid rivali.",
    flavor: "Per passare di qui serve il resto giusto.",
    costEuros: 400,
    costOil: 240,
    duration: 25,
    maxLevel: 5,
  },
  deposito: {
    id: "deposito",
    name: "Riserva Strategica",
    short: "Deposito",
    description: "Aumenta la capienza di euro e petrolio.",
    flavor: "Conservare al fresco, lontano dai decreti.",
    costEuros: 360,
    costOil: 190,
    duration: 20,
    maxLevel: 5,
  },
};

export const UNITS: Record<UnitId, UnitDef> = {
  vespa: {
    id: "vespa",
    name: "Vespa Ribelle",
    description: "Agile, economica e allergica ai rincari.",
    costEuros: 65,
    costOil: 25,
    power: 11,
    duration: 10,
    requiredLevel: 1,
  },
  ragioniere: {
    id: "ragioniere",
    name: "Ragioniere d’Assalto",
    description: "Trova il punto debole in ogni bilancio.",
    costEuros: 100,
    costOil: 40,
    power: 24,
    duration: 16,
    requiredLevel: 1,
  },
  autobotte: {
    id: "autobotte",
    name: "Autobotte Popolare",
    description: "Lenta, robusta e con il serbatoio pieno.",
    costEuros: 200,
    costOil: 115,
    power: 38,
    duration: 22,
    requiredLevel: 2,
  },
};

export const UNIT_STATS: Record<
  UnitId,
  { hp: number; speed: number; range: number; damage: number; interval: number }
> = {
  vespa: { hp: 65, speed: 1.65, range: 1.65, damage: 14, interval: 750 },
  ragioniere: { hp: 75, speed: 1.15, range: 4.3, damage: 22, interval: 1000 },
  autobotte: { hp: 220, speed: 0.95, range: 1.9, damage: 35, interval: 1500 },
};

export const BUILDING_HP: Record<BuildingId, number> = {
  municipio: 360,
  trivella: 210,
  deposito: 240,
  tesoreria: 210,
  caserma: 230,
  torre: 280,
};

export const BUILDING_LAYOUT: Record<BuildingId, { x: number; z: number }> = {
  municipio: { x: 0, z: -1.15 },
  trivella: { x: -1.55, z: -0.35 },
  deposito: { x: 1.55, z: -0.45 },
  tesoreria: { x: -1.45, z: 1.05 },
  caserma: { x: 0.05, z: 1.25 },
  torre: { x: 1.5, z: 1.05 },
};

export const LANE_X: Record<"left" | "center" | "right", number> = {
  left: -1.35,
  center: 0,
  right: 1.35,
};

export const emptyArmy = (): Army => ({ vespa: 0, ragioniere: 0, autobotte: 0 });

export const OPPONENTS: Opponent[] = [
  {
    id: "npc-distributore",
    name: "Distributore del Cugino",
    blurb: "Aperto 24 ore su 24. Chiuso per inventario.",
    level: 1,
    euros: 900,
    oil: 600,
    defense: 70,
    army: { vespa: 6, ragioniere: 0, autobotte: 0 },
  },
  {
    id: "npc-bar",
    name: "Bar del Rifornimento",
    blurb: "Un caffè, un pieno, una ricevuta illeggibile.",
    level: 1,
    euros: 1100,
    oil: 720,
    defense: 85,
    army: { vespa: 5, ragioniere: 2, autobotte: 0 },
  },
  {
    id: "npc-dogana",
    name: "Dogana del Balzello",
    blurb: "Passate, passate. Dopo il casello.",
    level: 2,
    euros: 1700,
    oil: 1100,
    defense: 140,
    army: { vespa: 8, ragioniere: 3, autobotte: 0 },
  },
  {
    id: "npc-autostrada",
    name: "Autostrada del Balzello",
    blurb: "Coda infinita, pedaggio aggiornato in tempo reale.",
    level: 3,
    euros: 2200,
    oil: 1500,
    defense: 200,
    army: { vespa: 10, ragioniere: 4, autobotte: 1 },
  },
  {
    id: "npc-ministero",
    name: "Ministero della Proroga",
    blurb: "Il decreto è pronto. Manca solo la firma.",
    level: 4,
    euros: 2800,
    oil: 1900,
    defense: 280,
    army: { vespa: 12, ragioniere: 5, autobotte: 2 },
  },
  {
    id: "npc-palazzo",
    name: "Palazzo della Stangata",
    blurb: "Qui le accise hanno un ufficio con vista.",
    level: 5,
    euros: 3600,
    oil: 2400,
    defense: 360,
    army: { vespa: 14, ragioniere: 6, autobotte: 4 },
  },
];

export const RADIO_QUOTES = [
  "«L’aumento è temporaneo», dichiarano dal 1935.",
  "Il petrolio passa. Le accise restano.",
  "Nuovo decreto: tutto come prima, ma più caro.",
  "La burocrazia non dorme. Al massimo fa pausa.",
  "Per passare di qui serve il resto giusto.",
  "Una monetina oggi, una manovrina domani.",
  "Pronti a partire. Prima però lo scontrino.",
];
