create table if not exists arcade_scores (
  name_key text primary key,
  display_name text not null,
  best_score integer not null,
  updated_at timestamptz not null default now()
);

create index if not exists arcade_scores_best_idx
  on arcade_scores (best_score desc, updated_at asc, name_key asc);
