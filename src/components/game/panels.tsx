import {
  Coins,
  Crown,
  Droplets,
  Flag,
  Fuel,
  Landmark,
  Minus,
  Plus,
  Shield,
  Swords,
  Truck,
  Warehouse,
  Wind,
} from "lucide-react";
import { BUILDINGS, MAX_ARMY, OPPONENTS, RAID_COOLDOWN_MS, UNITS, UNIT_ORDER } from "@/lib/game/catalog";
import {
  armyCount,
  canRaid,
  getArmyPower,
  getCapacity,
  getPendingResources,
  getProduction,
  getTrainingDuration,
  getUpgradeCost,
  levelOf,
  maxBuildLevel,
  townLevel,
} from "@/lib/game/engine";
import { formatIt, formatTimer } from "@/lib/utils";
import type { BuildingId, GameState, UnitId } from "@/lib/game/types";
import { useGame } from "@/lib/game/store";

export const buildingIcons = {
  municipio: Landmark,
  trivella: Fuel,
  tesoreria: Coins,
  caserma: Flag,
  torre: Shield,
  deposito: Warehouse,
};

export const unitIcons = {
  vespa: Wind,
  ragioniere: Crown,
  autobotte: Truck,
};

function SpriteThumb({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="grid size-12 shrink-0 overflow-hidden rounded-2xl bg-pine">
      <img src={src} alt={alt} className="h-full w-full object-contain" />
    </span>
  );
}

export function ResourceChip({
  value,
  cap,
  unit,
  tone,
}: {
  value: number;
  cap?: number;
  unit: string;
  tone: "gold" | "oil" | "trophy";
}) {
  const Icon = tone === "gold" ? Coins : tone === "oil" ? Droplets : Crown;
  const name = tone === "gold" ? "Tesoro" : tone === "oil" ? "Petrolio" : "Prestigio";
  return (
    <div
      aria-label={`${name} ${formatIt(value)}${unit ? ` ${unit}` : ""}`}
      className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-cream px-1.5 py-1.5 shadow-[0_2px_0_rgba(17,45,37,0.18)] sm:justify-start sm:gap-2 sm:px-2.5 sm:py-2"
    >
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-full sm:size-8 ${
          tone === "oil" ? "bg-sky text-grove" : "bg-[#f6e8be] text-[#8a6420]"
        }`}
      >
        <Icon size={15} />
      </span>
      <p className="whitespace-nowrap font-display text-[15px] font-semibold leading-none tabular-nums text-ink sm:text-[17px]">
        {formatIt(value)}
        {unit ? (
          <span className="ml-0.5 font-sans text-[10px] font-semibold not-italic text-muted">{unit}</span>
        ) : null}
        {cap != null && (
          <span className="ml-1 hidden font-sans text-[10px] font-medium not-italic text-muted/75 sm:inline">
            / {formatIt(cap)}
          </span>
        )}
      </p>
    </div>
  );
}

export function BuildingPanel({ state, selected, now }: { state: GameState; selected: BuildingId; now: number }) {
  const upgrade = useGame((s) => s.upgrade);
  const collect = useGame((s) => s.collect);
  const daily = useGame((s) => s.daily);
  const setSelected = useGame((s) => s.setSelected);
  const building = state.buildings.find((b) => b.id === selected)!;
  const def = BUILDINGS[selected];
  const cost = getUpgradeCost(state, selected);
  const cap = maxBuildLevel(state, selected);
  const busy = state.buildings.some((b) => b.upgradeEndsAt && b.upgradeEndsAt > now);
  const pending = getPendingResources(state, now);
  const production = getProduction(state);
  const capacity = getCapacity(state);
  const dailyReady = now - state.lastDailyAt >= 24 * 60 * 60 * 1000;
  const canPay = state.euros >= cost.euros && state.oil >= cost.oil && building.level < cap && !busy;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {state.buildings.map((b) => {
          const BIcon = buildingIcons[b.id];
          const active = b.id === selected;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setSelected(b.id)}
              className={`flex min-h-12 min-w-[4.3rem] flex-col items-center justify-center rounded-[14px] px-2 py-1.5 text-[10px] font-semibold ${
                active ? "bg-pine text-paper" : "bg-cream text-ink"
              }`}
            >
              <BIcon size={15} />
              <span className="whitespace-nowrap">{BUILDINGS[b.id].short}</span>
              <small className="whitespace-nowrap text-[10px] opacity-70">Lv. {b.level}</small>
            </button>
          );
        })}
      </div>

      <div className="rounded-[20px] bg-cream p-3 shadow-[0_8px_24px_rgba(17,45,37,0.08)] sm:p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 overflow-hidden rounded-2xl bg-pine sm:size-12">
            <img src={`/sprites/${selected}.png`} alt="" className="h-full w-full object-contain" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Livello {building.level}</p>
            <h2 className="font-display text-lg font-semibold text-ink sm:text-xl">{def.name}</h2>
            <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted">{def.description}</p>
            <p className="mt-2 hidden text-sm italic text-grove sm:block">{def.flavor}</p>
          </div>
        </div>

        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-paper px-3 py-1.5">
            <dt className="text-[10px] uppercase tracking-wider text-muted">Produzione</dt>
            <dd className="font-display font-semibold tabular-nums">
              {formatIt(production.euros)} € / {formatIt(production.oil)} L a min
            </dd>
          </div>
          <div className="rounded-xl bg-paper px-3 py-1.5">
            <dt className="text-[10px] uppercase tracking-wider text-muted">Capienza</dt>
            <dd className="font-display font-semibold tabular-nums">
              {formatIt(capacity.euros)} € · {formatIt(capacity.oil)} L
            </dd>
          </div>
        </dl>

        {building.upgradeEndsAt && building.upgradeEndsAt > now ? (
          <p className="mt-2 rounded-xl bg-sky px-3 py-2 text-sm text-pine">
            Cantiere in corso · {formatTimer(building.upgradeEndsAt - now)}
          </p>
        ) : building.level >= cap ? (
          <p className="mt-2 text-sm text-muted">
            {selected === "municipio" ? "Livello massimo del palazzo." : "Serve un municipio più alto."}
          </p>
        ) : (
          <button
            type="button"
            disabled={!canPay}
            onClick={() => upgrade(selected)}
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-terracotta px-4 font-display text-base font-semibold text-pine-deep disabled:opacity-45"
          >
            Potenzia · {formatIt(cost.euros)} € · {formatIt(cost.oil)} L · {cost.duration}s
          </button>
        )}

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={collect}
            className="min-h-11 rounded-2xl bg-pine px-3 font-semibold text-paper"
          >
            Riscuoti
            {(pending.euros > 0 || pending.oil > 0) && (
              <span className="ml-1 font-medium text-gold">
                +{formatIt(pending.euros)} / +{formatIt(pending.oil)}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={daily}
            disabled={!dailyReady}
            className="min-h-11 rounded-2xl border border-line bg-paper px-3 font-semibold text-ink disabled:opacity-45"
          >
            Fondo del giorno
          </button>
        </div>
      </div>
    </div>
  );
}

export function ArmyView({ state, now }: { state: GameState; now: number }) {
  const train = useGame((s) => s.train);
  const caserma = levelOf(state, "caserma");
  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Esercito</p>
        <h2 className="font-display text-2xl font-semibold">Piccoli mezzi. Grandi ambizioni.</h2>
        <p className="mt-1 text-sm text-muted">
          {armyCount(state.army)} / {MAX_ARMY} truppe · forza {getArmyPower(state.army)}
        </p>
      </header>
      {state.training && state.training.endsAt > now && (
        <p className="rounded-2xl bg-sky px-4 py-3 text-sm text-pine">
          In addestramento: {state.training.count} {UNITS[state.training.unit].name} ·{" "}
          {formatTimer(state.training.endsAt - now)}
        </p>
      )}
      <div className="grid gap-3">
        {UNIT_ORDER.map((id) => (
          <UnitRecruit key={id} id={id} state={state} caserma={caserma} now={now} onTrain={train} />
        ))}
      </div>
    </div>
  );
}

function UnitRecruit({
  id,
  state,
  caserma,
  now,
  onTrain,
}: {
  id: UnitId;
  state: GameState;
  caserma: number;
  now: number;
  onTrain: (id: UnitId, count: number) => void;
}) {
  const def = UNITS[id];
  const locked = caserma < def.requiredLevel;
  const duration = getTrainingDuration(state, id, 1);
  return (
    <article className="rounded-[22px] bg-cream p-4">
      <div className="flex items-start gap-3">
        <SpriteThumb src={`/sprites/${id}.png`} alt={def.name} />
        <div className="flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-display text-lg font-semibold">{def.name}</h3>
            <strong className="tabular-nums">{state.army[id]}</strong>
          </div>
          <p className="text-sm text-muted">{def.description}</p>
          <p className="mt-1 flex gap-3 text-xs font-semibold text-grove">
            <span>{def.power} forza</span>
            <span>{formatIt(def.costEuros)} €</span>
            <span>{formatIt(def.costOil)} L</span>
            <span>{Math.round(duration / 1000)}s</span>
          </p>
        </div>
      </div>
      {locked ? (
        <p className="mt-3 text-sm text-muted">Sblocca con Caserma livello {def.requiredLevel}.</p>
      ) : (
        <div className="mt-3 flex gap-2">
          {[1, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={Boolean(state.training && state.training.endsAt > now)}
              onClick={() => onTrain(id, n)}
              className="min-h-11 flex-1 rounded-xl bg-pine text-sm font-semibold text-paper disabled:opacity-45"
            >
              Recluta {n}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

export function RaidView({ state, now }: { state: GameState; now: number }) {
  const raidArmy = useGame((s) => s.raidArmy);
  const setRaidCount = useGame((s) => s.setRaidCount);
  const startRaid = useGame((s) => s.startRaid);
  const lastResult = useGame((s) => s.lastResult);
  const ready = canRaid(state, now);
  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Raid</p>
        <h2 className="font-display text-2xl font-semibold">Avamposti del Bel Paese</h2>
        <p className="mt-1 text-sm text-muted">
          35 secondi, tre corsie. I caduti non tornano; le riserve sì.
        </p>
      </header>
      {state.shieldUntil > now && (
        <p className="rounded-2xl bg-sky px-4 py-3 text-sm text-pine">
          Scudo attivo · {formatTimer(state.shieldUntil - now)}. I sopralluoghi restano al casello.
        </p>
      )}
      {!ready && (
        <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-muted">
          Rifornimento in corso · {formatTimer(RAID_COOLDOWN_MS - (now - state.lastAttackAt))}
        </p>
      )}
      {lastResult && (
        <div className="rounded-2xl bg-pine px-4 py-3 text-paper">
          <p className="font-display text-lg">
            {lastResult.won ? "Vittoria" : "Ritirata"} · {lastResult.stars} stelle
          </p>
          <p className="text-sm text-paper/80">
            {lastResult.defenderName} · +{formatIt(lastResult.lootEuros)} € · +{formatIt(lastResult.lootOil)} L ·{" "}
            {lastResult.trophyDelta > 0 ? "+" : ""}
            {lastResult.trophyDelta} prestigio
          </p>
        </div>
      )}
      <section className="rounded-[22px] bg-cream p-4">
        <h3 className="font-display text-lg">La tua squadra</h3>
        <div className="mt-3 space-y-2">
          {UNIT_ORDER.map((id) => (
            <div key={id} className="grid grid-cols-[minmax(0,1fr)_auto_2.5rem_auto_2.25rem] items-center gap-1.5">
              <span className="text-sm font-semibold leading-tight">{UNITS[id].short}</span>
              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-paper"
                onClick={() => setRaidCount(id, raidArmy[id] - 1)}
                aria-label={`Togli ${UNITS[id].name}`}
              >
                <Minus size={16} />
              </button>
              <strong className="text-center tabular-nums">{raidArmy[id]}</strong>
              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-paper"
                onClick={() => setRaidCount(id, raidArmy[id] + 1)}
                aria-label={`Aggiungi ${UNITS[id].name}`}
              >
                <Plus size={16} />
              </button>
              <span className="text-right text-xs text-muted">/ {state.army[id]}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">
          Forza {getArmyPower(raidArmy)} · {armyCount(raidArmy)} mezzi
        </p>
      </section>
      <div className="grid gap-3">
        {OPPONENTS.map((npc) => {
          const trophies = state.npcTrophies[npc.id] ?? npc.level * 75;
          return (
            <article key={npc.id} className="rounded-[22px] bg-cream p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted">Livello {npc.level}</p>
                  <h3 className="font-display text-lg font-semibold">{npc.name}</h3>
                  <p className="text-sm text-muted">{npc.blurb}</p>
                  <p className="mt-1 text-xs font-semibold text-grove">
                    {formatIt(npc.euros)} € · {formatIt(npc.oil)} L · {trophies} trofei
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!ready || armyCount(raidArmy) === 0}
                  onClick={() => startRaid(npc.id)}
                  className="min-h-11 shrink-0 rounded-2xl bg-terracotta px-4 font-semibold text-pine-deep disabled:opacity-45"
                >
                  <Swords className="mr-1 inline" size={16} /> Raid
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function BoardView({ state }: { state: GameState }) {
  const rows = [
    {
      id: "you",
      name: state.townName,
      trophies: state.trophies,
      level: townLevel(state),
      wins: state.wins,
      you: true,
    },
    ...OPPONENTS.map((npc) => ({
      id: npc.id,
      name: npc.name,
      trophies: state.npcTrophies[npc.id] ?? npc.level * 75,
      level: npc.level,
      wins: npc.level,
      you: false,
    })),
  ].sort((a, b) => b.trophies - a.trophies);

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Classifica</p>
        <h2 className="font-display text-2xl font-semibold">Prestigio del distretto</h2>
      </header>
      <ol className="space-y-2">
        {rows.map((row, i) => (
          <li
            key={row.id}
            className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${
              row.you ? "bg-pine text-paper" : "bg-cream"
            }`}
          >
            <span className="w-6 font-display text-lg tabular-nums">{i + 1}</span>
            <div className="flex-1">
              <p className="font-semibold">{row.name}</p>
              <p className={`text-xs ${row.you ? "text-paper/70" : "text-muted"}`}>
                Livello {row.level} · {row.wins} vittorie
              </p>
            </div>
            <strong className="tabular-nums">{formatIt(row.trophies)}</strong>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function DiaryView({
  diary,
}: {
  diary: { id: string; at: number; text: string; kind: string }[];
}) {
  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Diario</p>
        <h2 className="font-display text-2xl font-semibold">Cronache comunali</h2>
      </header>
      {diary.length === 0 ? (
        <p className="text-sm text-muted">Il registro è ancora vuoto. Riscuoti, costruisci, parti.</p>
      ) : (
        <ol className="space-y-2">
          {diary.map((event) => (
            <li key={event.id} className="rounded-2xl bg-cream px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-muted">
                {new Date(event.at).toLocaleString("it-IT", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "short",
                })}
              </p>
              <p className="text-sm leading-relaxed">{event.text}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
