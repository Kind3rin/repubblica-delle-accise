import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CircleHelp,
  CloudFog,
  Flag,
  Fuel,
  Map,
  Medal,
  Megaphone,
  ScrollText,
  Star,
  Swords,
  X,
} from "lucide-react";
import { BATTLE_DURATION_MS, OPPONENTS, RADIO_QUOTES, UNITS, UNIT_ORDER } from "@/lib/game/catalog";
import { LANE_IDS, laneLabel } from "@/lib/game/battle";
import { getCapacity, getPendingResources } from "@/lib/game/engine";
import { formatIt, formatTimer } from "@/lib/utils";
import { useGame } from "@/lib/game/store";
import type { BattleLane, Tab, UnitId } from "@/lib/game/types";
import { BattleCanvas } from "./BattleCanvas";
import { VillageCanvas } from "./VillageCanvas";
import {
  ArmyView,
  BoardView,
  BuildingPanel,
  DiaryView,
  RaidView,
  ResourceChip,
} from "./panels";

const NAV: { id: Tab; label: string; icon: typeof Map }[] = [
  { id: "village", label: "Villaggio", icon: Map },
  { id: "army", label: "Esercito", icon: Flag },
  { id: "raid", label: "Raid", icon: Swords },
  { id: "board", label: "Classifica", icon: Medal },
  { id: "diary", label: "Diario", icon: ScrollText },
];

export function GameShell() {
  const state = useGame((s) => s.state);
  const diary = useGame((s) => s.diary);
  const tab = useGame((s) => s.tab);
  const selected = useGame((s) => s.selected);
  const now = useGame((s) => s.now);
  const toast = useGame((s) => s.toast);
  const error = useGame((s) => s.error);
  const battle = useGame((s) => s.battle);
  const setTab = useGame((s) => s.setTab);
  const setSelected = useGame((s) => s.setSelected);
  const tick = useGame((s) => s.tick);
  const foundTown = useGame((s) => s.foundTown);
  const hydrate = useGame((s) => s.hydrate);
  const dismissToast = useGame((s) => s.dismissToast);
  const finishBattle = useGame((s) => s.finishBattle);
  const collect = useGame((s) => s.collect);
  const lastResult = useGame((s) => s.lastResult);
  const [help, setHelp] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const id = window.setInterval(() => tick(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [tick]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!toast && !error) return;
    const id = window.setTimeout(() => dismissToast(), 4200);
    return () => window.clearTimeout(id);
  }, [toast, error, dismissToast]);

  const fighting = Boolean(battle) && !battle?.finished;

  useEffect(() => {
    if (!fighting) return;
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const current = useGame.getState().battle;
      if (!current || current.finished) return;
      const dt = Math.min(50, t - last);
      last = t;
      useGame.getState().advanceBattle(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fighting]);

  useEffect(() => {
    if (battle?.finished && !lastResult) finishBattle();
  }, [battle, lastResult, finishBattle]);

  if (!state) {
    return (
      <Welcome
        name={name}
        setName={setName}
        onSubmit={() => foundTown(name)}
        error={error}
      />
    );
  }

  const cap = getCapacity(state);
  const pending = getPendingResources(state, now);
  const quote = RADIO_QUOTES[Math.floor(now / 12000) % RADIO_QUOTES.length];

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1100px] flex-col overflow-x-hidden bg-paper text-ink">
      <header className="sticky top-0 z-20 flex flex-col gap-2 bg-pine px-3 pb-3 pt-[max(0.6rem,env(safe-area-inset-top))] text-paper shadow-[0_3px_0_rgba(17,45,37,0.35)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-10 rotate-[-6deg] place-items-center rounded-[13px] bg-cream text-pine shadow-[3px_3px_0_#102e25]">
              <Fuel size={20} />
            </span>
            <div className="leading-tight">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-paper/70">
                Repubblica delle
              </p>
              <p className="font-display text-[22px] font-extrabold tracking-[0.08em]">ACCISE</p>
            </div>
          </div>
          <div className="ml-auto">
            <button
              type="button"
              aria-label="Come si gioca"
              onClick={() => setHelp(true)}
              className="grid size-11 place-items-center rounded-full bg-pine-deep text-paper"
            >
              <CircleHelp size={20} />
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <ResourceChip label="Tesoro" value={state.euros} cap={cap.euros} unit="€" tone="gold" />
          <ResourceChip label="Petrolio" value={state.oil} cap={cap.oil} unit="L" tone="oil" />
          <ResourceChip label="Prestigio" value={state.trophies} unit="trofei" tone="trophy" />
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        {tab === "village" ? (
          <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-none">
            <section className="relative h-[min(42dvh,380px)] min-h-[220px] lg:h-auto lg:min-h-0 lg:flex-1">
              <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[min(100%-1.5rem,22rem)] rounded-2xl bg-paper/90 px-3 py-2 text-sm shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Strategia all’italiana
                </p>
                <h1 className="font-display text-lg font-semibold leading-tight">
                  Comune di {state.townName}
                </h1>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{quote}</p>
              </div>
              <VillageCanvas
                state={state}
                selected={selected}
                onSelect={setSelected}
                reducedMotion={reduced}
              />
              {(pending.euros > 10 || pending.oil > 10) && (
                <button
                  type="button"
                  onClick={collect}
                  className="absolute bottom-3 left-3 z-10 min-h-11 rounded-full bg-pine px-4 py-2 text-sm font-semibold text-paper shadow-[0_4px_0_rgba(17,45,37,0.35)]"
                >
                  Riscuoti · {Math.floor(pending.euros)} € · {Math.floor(pending.oil)} L
                </button>
              )}
            </section>
            <aside className="min-h-0 overflow-y-auto border-t border-line bg-paper px-3 py-3 pb-6 lg:border-l lg:border-t-0 lg:py-4 lg:pb-4">
              <BuildingPanel state={state} selected={selected} now={now} />
            </aside>
          </div>
        ) : (
          <section className="flex-1 overflow-y-auto px-4 py-4 pb-28">
            {tab === "army" && <ArmyView state={state} now={now} />}
            {tab === "raid" && <RaidView state={state} now={now} />}
            {tab === "board" && <BoardView state={state} />}
            {tab === "diary" && <DiaryView diary={diary} />}
          </section>
        )}
      </main>

      <nav
        className="sticky bottom-0 z-20 border-t border-pine/10 bg-paper/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur"
        aria-label="Navigazione del gioco"
      >
        <div className="grid grid-cols-5 gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold ${
                  active ? "bg-pine text-paper" : "text-muted"
                }`}
              >
                <Icon size={20} />
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-center text-[11px] text-muted">
          Fatto in Italia. <strong className="text-ink">Tassato ovunque.</strong>
        </p>
      </nav>

      {(toast || error) && !battle && (
        <div
          role="status"
          className={`fixed bottom-24 left-1/2 z-30 w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl px-4 py-3 text-sm shadow-lg ${
            error ? "bg-[#6a3b2c] text-paper" : "bg-pine text-paper"
          }`}
        >
          {error || toast}
        </div>
      )}

      {help && createPortal(<HelpModal onClose={() => setHelp(false)} />, document.body)}
      {battle && createPortal(<BattleOverlay />, document.body)}
    </div>
  );
}

function Welcome({
  name,
  setName,
  onSubmit,
  error,
}: {
  name: string;
  setName: (v: string) => void;
  onSubmit: () => void;
  error: string | null;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-pine px-5 pb-10 pt-[max(2rem,env(safe-area-inset-top))] text-paper">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <span className="grid size-16 rotate-[-8deg] place-items-center rounded-2xl bg-cream text-pine shadow-[4px_4px_0_#0d241c]">
          <Fuel size={32} />
        </span>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
          Edizione Bel Paese
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold leading-[1.05]">
          Un piccolo comune.
          <br />
          Grandi accise.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-paper/80">
          Costruisci il borgo, raccogli petrolio, guida un esercito di Vespe. Satira italiana, risorse
          di fantasia, nessun acquisto.
        </p>
        <label className="mt-8 text-sm font-semibold">
          Nome del comune
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="Borgo delle Accise"
            className="mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-pine-deep px-4 text-base text-paper outline-none placeholder:text-paper/40"
          />
        </label>
        {error && <p className="mt-2 text-sm text-terracotta">{error}</p>}
        <button
          type="button"
          onClick={onSubmit}
          className="mt-5 min-h-12 rounded-2xl bg-terracotta font-display text-lg font-semibold text-pine-deep"
        >
          Fonda il tuo comune
        </button>
        <p className="mt-6 text-sm text-paper/60">
          I progressi restano su questo dispositivo. «L’aumento è temporaneo», dichiarano dal 1935.
        </p>
      </div>
    </div>
  );
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-pine-deep/70 p-3 sm:place-items-center">
      <div className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-[24px] bg-paper p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold">Come si gioca</h2>
          <button type="button" className="grid size-11 place-items-center" onClick={onClose} aria-label="Chiudi">
            <X />
          </button>
        </div>
        <ol className="mt-4 space-y-3 text-sm leading-relaxed">
          <li>
            <strong>Riscuoti le entrate.</strong> Tesoreria e trivella producono anche mentre sei via, fino a 8 ore.
          </li>
          <li>
            <strong>Fai crescere il comune.</strong> Un cantiere alla volta. Il municipio sblocca i livelli degli altri edifici.
          </li>
          <li>
            <strong>Recluta un esercito.</strong> Vespe subito, autobotti dalla caserma livello 2. Massimo 50 mezzi.
          </li>
          <li>
            <strong>Parti per un raid.</strong> 35 secondi, tre corsie. Adunata aumenta danni e velocità; Fumogeno zittisce le difese.
          </li>
        </ol>
        <p className="mt-4 rounded-2xl bg-sky px-4 py-3 text-sm text-pine">
          <strong>Un gioco, una satira.</strong> Personaggi, decreti, prezzi e risorse sono inventati. Nessun
          acquisto, nessun denaro reale.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 min-h-12 w-full rounded-2xl bg-pine font-semibold text-paper"
        >
          Ho capito, al lavoro.
        </button>
      </div>
    </div>
  );
}

function BattleOverlay() {
  const battle = useGame((s) => s.battle)!;
  const battleTarget = useGame((s) => s.battleTarget);
  const lastResult = useGame((s) => s.lastResult);
  const deploy = useGame((s) => s.deploy);
  const ability = useGame((s) => s.ability);
  const [lane, setLane] = useState<BattleLane>("center");
  const [unit, setUnit] = useState<UnitId>("vespa");
  const left = Math.max(0, BATTLE_DURATION_MS - battle.elapsed);
  const opponent = OPPONENTS.find((o) => o.id === battleTarget);
  const done = battle.finished && lastResult;

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-pine-deep text-paper">
      <header className="flex items-center gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cream text-pine">
          <Swords size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-paper/60">
            {done ? "Raid concluso" : "Raid in corso"}
          </p>
          <h2 className="truncate font-display text-lg sm:text-xl">{opponent?.name ?? "Campo nemico"}</h2>
        </div>
        {!done && (
          <div className={`shrink-0 text-right ${left < 8000 ? "text-terracotta" : "text-gold"}`}>
            <p className="font-display text-2xl tabular-nums leading-none">{formatTimer(left)}</p>
            <p className="text-[10px] uppercase tracking-wider">tempo</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            if (done) useGame.getState().closeBattle();
            else useGame.getState().finishBattle();
          }}
          aria-label={done ? "Chiudi risultato" : "Ritirati"}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-pine"
        >
          <X size={18} />
        </button>
      </header>
      <div className="min-h-0 flex-1 px-2">
        <BattleCanvas frame={battle} />
      </div>
      <div className="space-y-3 bg-paper px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 text-ink">
        {done && lastResult ? (
          <div className="space-y-3">
            <div className="text-center">
              <p className="font-display text-2xl font-semibold">
                {lastResult.won ? "Vittoria comunale" : "Ritirata ordinata"}
              </p>
              <div className="mt-1 flex items-center justify-center gap-1 text-terracotta">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Star key={i} size={18} fill={i < lastResult.stars ? "currentColor" : "none"} />
                ))}
              </div>
              <p className="mt-2 text-sm text-muted">
                +{formatIt(lastResult.lootEuros)} € · +{formatIt(lastResult.lootOil)} L ·{" "}
                {lastResult.trophyDelta > 0 ? "+" : ""}
                {lastResult.trophyDelta} prestigio
              </p>
            </div>
            <button
              type="button"
              onClick={() => useGame.getState().closeBattle()}
              className="min-h-12 w-full rounded-2xl bg-terracotta font-display text-lg font-semibold text-pine-deep"
            >
              Continua
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs font-semibold text-muted">
              <span>
                Distruzione {Math.round(battle.destruction * 100)}% · {battle.stars} stelle
              </span>
              <span>
                {battle.rallyUntil > battle.elapsed && (
                  <em className="mr-2 not-italic text-terracotta">Adunata</em>
                )}
                {battle.smokeUntil > battle.elapsed && <em className="not-italic text-grove">Fumogeno</em>}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {LANE_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLane(id)}
                  className={`min-h-11 rounded-xl text-sm font-semibold ${
                    lane === id ? "bg-pine text-paper" : "bg-cream"
                  }`}
                >
                  {laneLabel(id)}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {UNIT_ORDER.map((id) => {
                const Icon = id === "vespa" ? Fuel : Flag;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setUnit(id)}
                    className={`min-h-12 rounded-xl px-2 text-left text-xs ${
                      unit === id ? "bg-pine text-paper" : "bg-cream"
                    }`}
                  >
                    <Icon size={14} className="mb-1" />
                    <strong className="block truncate">{UNITS[id].name}</strong>
                    riserva {battle.reserve[id]}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
              <button
                type="button"
                onClick={() => deploy(unit, 1, lane)}
                className="min-h-12 rounded-2xl bg-terracotta font-semibold text-pine-deep"
              >
                Schiera 1
              </button>
              <button
                type="button"
                onClick={() => deploy(unit, 99, lane)}
                className="min-h-12 rounded-2xl bg-pine font-semibold text-paper"
              >
                Tutti
              </button>
              <button
                type="button"
                disabled={battle.rallyUntil !== 0}
                onClick={() => ability("rally")}
                aria-label="Adunata"
                className="grid min-h-12 place-items-center rounded-2xl bg-cream disabled:opacity-40"
              >
                <Megaphone size={18} />
              </button>
              <button
                type="button"
                disabled={battle.smokeUntil !== 0}
                onClick={() => ability("smoke")}
                aria-label="Fumogeno"
                className="grid min-h-12 place-items-center rounded-2xl bg-cream disabled:opacity-40"
              >
                <CloudFog size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
