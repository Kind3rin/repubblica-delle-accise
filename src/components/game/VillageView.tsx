import { useEffect, useState, type ComponentType } from "react";
import { canUseWebGL } from "@/lib/game/webgl";
import type { BuildingId, GameState } from "@/lib/game/types";
import { VillageCanvas } from "./VillageCanvas";

type Props = {
  state: GameState;
  selected: BuildingId;
  onSelect: (id: BuildingId) => void;
  reducedMotion: boolean;
};

type SceneProps = Props & { onContextLost: () => void };

function VillageFallback() {
  return (
    <div
      className="h-full min-h-0 w-full bg-linear-to-b from-[#d7eef6] via-[#e7f3d8] to-[#8fb56f]"
      aria-hidden
    />
  );
}

export function VillageView(props: Props) {
  const [mode, setMode] = useState<"pending" | "3d" | "2d">("pending");
  const [Scene, setScene] = useState<ComponentType<SceneProps> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!canUseWebGL()) {
      setMode("2d");
      return;
    }
    void import("./Village3D")
      .then((mod) => {
        if (cancelled) return;
        setScene(() => mod.Village3D);
        setMode("3d");
      })
      .catch(() => {
        if (!cancelled) setMode("2d");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (mode === "3d" && Scene) {
    return <Scene {...props} onContextLost={() => setMode("2d")} />;
  }
  if (mode === "2d") {
    return <VillageCanvas {...props} />;
  }
  return <VillageFallback />;
}
