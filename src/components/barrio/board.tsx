import { SUIT_NAME, ZONES, type ZoneId } from "@/game/content";
import { reduction, type Card, type Game } from "@/game/engine";
import { ZoneArt, CenterMark } from "@/components/barrio/pixel";

export function MonopolyBoard({
  game,
  previewDeltas,
  previewWater,
  hoverZone,
  busy,
  armed,
  onZone,
}: {
  game: Game;
  previewDeltas: Partial<Record<ZoneId, number>>;
  previewWater: Record<ZoneId, number>;
  hoverZone: ZoneId | null;
  busy: boolean;
  armed: Card | null;
  onZone: (zone: ZoneId) => void;
}) {
  return (
    <div className="scene">
      <div className="table-shadow" />
      <div className={game.phase === "rising" ? "board-rig rumble" : "board-rig"}>
        <div className="tabletop-slab" />
        <div className="board-frame">
          {ZONES.map((zone) => {
            const level = game.water[zone.id];
            const inc = previewDeltas[zone.id] ?? 0;
            const soon = previewWater[zone.id] >= 3 && level < 3;
            const showDrop =
              armed && armed.suit !== "wild" ? Math.min(level, reduction(armed, zone.id).total) : 0;
            return (
              <button
                key={zone.id}
                type="button"
                data-zone={zone.id}
                disabled={busy}
                onClick={() => onZone(zone.id)}
                className={[
                  "zone",
                  level >= 3 ? "flood" : "",
                  soon ? "soon" : "",
                  armed ? "tgt" : "",
                  hoverZone === zone.id ? "hot" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ gridArea: zone.id, ["--stripe" as string]: `var(--suit-${zone.suit})` }}
              >
                <span className="cap">
                  <span className="stripe" />
                  {inc > 0 && game.phase !== "rising" && <span className="inc">+{inc}</span>}
                  {showDrop > 0 && <span className="drop">−{showDrop}</span>}
                  <span className="water" style={{ ["--level" as string]: waterLevel(zone.id, level) }}>
                    <i className="foam" />
                  </span>
                  {game.fx
                    .filter((f) => f.zone === zone.id && f.up)
                    .slice(0, 1)
                    .map((f) => (
                      <span key={f.id} className="splashes" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                        <i />
                      </span>
                    ))}
                  <ZoneArt id={zone.id} />
                  <span className="meta">
                    <span className="zname">{zone.name}</span>
                    <span className="zrole">{SUIT_NAME[zone.suit]}</span>
                    <span className="meta-foot">
                      <span className="pips" aria-label={`Agua ${level} de 3`}>
                        {[0, 1, 2].map((i) => (
                          <i key={i} className={i < level ? "on" : ""} />
                        ))}
                      </span>
                      {zone.vital && <span className="vital">Vital</span>}
                    </span>
                  </span>
                  {game.fx
                    .filter((f) => f.zone === zone.id)
                    .map((f) => (
                      <b key={f.id} className={f.up ? "floater up" : "floater down"}>
                        {f.text}
                      </b>
                    ))}
                </span>
              </button>
            );
          })}
          <div className="center-court">
            <CenterMark />
            <b>BARRIO</b>
            <span>{game.mode === "learn" ? `Ronda ${game.round} de 10` : `Ronda ${game.round}`}</span>
          </div>
        </div>
      </div>
      <p className="legend">
        <span><i className="swatch azul" /> Infraestructura</span>
        <span><i className="swatch verde" /> Naturaleza</span>
        <span><i className="swatch amarillo" /> Comunidad</span>
        <span><i className="swatch rojo" /> Emergencia</span>
      </p>
    </div>
  );
}

function waterLevel(id: ZoneId, level: number): string {
  const table = id === "arroyo" ? ["18%", "40%", "62%", "86%"] : ["0%", "34%", "58%", "84%"];
  return table[Math.max(0, Math.min(3, level))] ?? "0%";
}
