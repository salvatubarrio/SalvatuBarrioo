import { createServerFn } from "@tanstack/react-start";
import { cleanName } from "@/game/storage";

export type RankRow = {
  place: number;
  name: string;
  score: number;
};

export type RankMine = {
  place: number;
  name: string;
  score: number;
};

export type RankList = {
  rows: RankRow[];
  mine: RankMine | null;
};

export type RankSnapshot = RankList & {
  previous: number;
  best: number;
  improved: boolean;
};

const TOP = 20;

function keyOf(name: string) {
  return name.toLowerCase();
}

function asNumber(value: unknown): number {
  const n = typeof value === "bigint" ? Number(value) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function readBoard(sql: Awaited<ReturnType<typeof import("@/lib/db").getSql>>, name: string): Promise<RankList> {
  const listed = await sql<{ display_name: string; best_score: number }>`
    select display_name, best_score
    from arcade_scores
    order by best_score desc, updated_at asc, name_key asc
    limit ${TOP}
  `;
  const rows: RankRow[] = listed.map((row, index) => ({
    place: index + 1,
    name: row.display_name,
    score: asNumber(row.best_score),
  }));
  const key = name ? keyOf(name) : "";
  if (!key) return { rows, mine: null };
  const mineRows = await sql<{ display_name: string; best_score: number; place: number }>`
    select display_name, best_score, (
      select count(*)::int + 1
      from arcade_scores other
      where other.best_score > arcade_scores.best_score
         or (
           other.best_score = arcade_scores.best_score
           and (
             other.updated_at < arcade_scores.updated_at
             or (other.updated_at = arcade_scores.updated_at and other.name_key < arcade_scores.name_key)
           )
         )
    ) as place
    from arcade_scores
    where name_key = ${key}
  `;
  const mineRow = mineRows[0];
  if (!mineRow) return { rows, mine: null };
  return {
    rows,
    mine: {
      place: asNumber(mineRow.place),
      name: mineRow.display_name,
      score: asNumber(mineRow.best_score),
    },
  };
}

export const getArcadeRanking = createServerFn({ method: "POST" })
  .validator((name: unknown): string => {
    if (typeof name !== "string") return "";
    return cleanName(name) ?? "";
  })
  .handler(async ({ data }): Promise<RankList> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    return readBoard(sql, data);
  });

export const submitArcadeBest = createServerFn({ method: "POST" })
  .validator((input: unknown): { name: string; score: number } => {
    const raw = input as { name?: unknown; score?: unknown } | null;
    const name = cleanName(typeof raw?.name === "string" ? raw.name : "");
    const score = Math.floor(Number(raw?.score));
    if (!name) throw new Error("Nombre inválido");
    if (!Number.isFinite(score) || score < 0 || score > 1_000_000_000) throw new Error("Puntaje inválido");
    return { name, score };
  })
  .handler(async ({ data }): Promise<RankSnapshot> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const key = keyOf(data.name);
    let previous = 0;
    let best = 0;
    if (data.score > 0) {
      const saved = await sql<{ previous: number; best: number }>`
        with prev as (
          select best_score from arcade_scores where name_key = ${key}
        ),
        up as (
          insert into arcade_scores (name_key, display_name, best_score)
          values (${key}, ${data.name}, ${data.score})
          on conflict (name_key) do update set
            best_score = greatest(arcade_scores.best_score, excluded.best_score),
            display_name = case
              when excluded.best_score > arcade_scores.best_score then excluded.display_name
              else arcade_scores.display_name
            end,
            updated_at = case
              when excluded.best_score > arcade_scores.best_score then now()
              else arcade_scores.updated_at
            end
          returning best_score
        )
        select
          coalesce((select best_score from prev), 0)::int as previous,
          coalesce((select best_score from up), 0)::int as best
      `;
      previous = asNumber(saved[0]?.previous);
      best = asNumber(saved[0]?.best);
    } else {
      const existing = await sql<{ best_score: number }>`
        select best_score from arcade_scores where name_key = ${key}
      `;
      previous = asNumber(existing[0]?.best_score);
      best = previous;
    }
    const list = await readBoard(sql, data.name);
    return {
      ...list,
      previous,
      best,
      improved: data.score > previous,
    };
  });
