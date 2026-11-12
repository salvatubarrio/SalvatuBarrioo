import { Trophy } from "lucide-react";
import type { RankMine, RankRow } from "@/game/ranking";

export function ArcadeRankList({
  rows,
  me,
  mine,
  error,
  compact = false,
}: {
  rows: RankRow[];
  me: string;
  mine: RankMine | null;
  error?: boolean;
  compact?: boolean;
}) {
  const key = me.trim().toLowerCase();
  const shown = compact ? rows.slice(0, 8) : rows;
  const mineVisible = mine ? shown.some((row) => row.name.toLowerCase() === mine.name.toLowerCase()) : true;

  return (
    <section className={compact ? "arcade-rank compact" : "panel arcade-rank"}>
      <div className="row">
        <h2>
          <Trophy size={18} style={{ verticalAlign: "-3px" }} /> Ranking arcade
        </h2>
      </div>
      {error && <p className="err">No se pudo cargar el ranking. Probá de nuevo en un rato.</p>}
      {!error && rows.length === 0 ? (
        <p className="empty">Todavía no hay récords. El primer puesto está libre.</p>
      ) : (
        <ol className="board-list">
          <li className="rank-head">
            <span>Pos.</span>
            <span>Jugador</span>
            <span>Mejor</span>
          </li>
          {shown.map((row) => {
            const mineRow = row.name.toLowerCase() === key;
            return (
              <li key={row.name.toLowerCase()} className={mineRow ? "me" : undefined}>
                <span className={row.place === 1 ? "pos gold" : "pos"}>{row.place}</span>
                <span className="who">
                  {row.name}
                  {mineRow && <span className="you-tag">vos</span>}
                </span>
                <span className="pts">{row.score}</span>
              </li>
            );
          })}
        </ol>
      )}
      {!error && mine && !mineVisible && (
        <p className="empty you-line">
          Tu puesto: #{mine.place} · {mine.name} · {mine.score} pts
        </p>
      )}
    </section>
  );
}
