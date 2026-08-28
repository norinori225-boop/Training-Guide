-- ============================================================================
-- ジャンル（genre）の追加 — STEP 7-1「データベースの変更」
--
-- 適用方法: Supabase ダッシュボード → SQL Editor にこのファイルの中身を
--           全部貼り付けて Run（詳しくは README.md「ジャンル追加の適用手順」）
--
-- 目的:
--   trainings / categories に最上位の軸「ジャンル」を足す。
--   コード値は 'body-play'（体遊びトレーニング）と 'lifting'（リフティング
--   トレーニング）の2つで固定。管理画面からは増やせない。
--   表示名の定義元は lib/constants.ts（GENRE_LABELS / GENRE_SHORT_LABELS）。
--
-- 前提:
--   本番に既存データが入っている状態で実行する。既存行は壊さず、すべて
--   'body-play' に寄せる。
--
-- このファイルは何度実行しても同じ結果になる（冪等）ように書いてあります。
-- ============================================================================


-- ============================================================================
-- 1. trainings.genre
--
-- 順序が重要:
--   追加(default付き) → backfill確認 → default外す → not null + CHECK
-- default を付けたまま列を足すことで既存行が一瞬で埋まり、そのあと default を
-- 外すことで「以後の insert はジャンルの明示指定を必須」にできる。
-- ============================================================================

-- 1-1. default 付きで追加（既存行はこの時点で 'body-play' に埋まる）
alter table public.trainings
  add column if not exists genre text default 'body-play';

-- 1-2. backfill の確認（再実行時や、default 削除後に列だけ残っている場合の保険）
update public.trainings set genre = 'body-play' where genre is null;

do $$
declare
  remaining bigint;
begin
  select count(*) into remaining from public.trainings where genre is null;
  if remaining > 0 then
    raise exception 'trainings.genre が未設定の行が % 件あります。backfill を確認してください。', remaining;
  end if;
end
$$;

-- 1-3. default を外す（以後は insert 時にジャンルを明示指定する）
alter table public.trainings
  alter column genre drop default;

-- 1-4. not null と CHECK
alter table public.trainings
  alter column genre set not null;

alter table public.trainings
  drop constraint if exists trainings_genre_valid;

alter table public.trainings
  add constraint trainings_genre_valid
  check (genre in ('body-play', 'lifting'));

comment on column public.trainings.genre is
  '最上位の分類。コード値の定義元は lib/constants.ts の GENRE_CODES。default は意図的に付けない（明示指定を必須にするため）。';

-- 1-5. 一覧はジャンルで絞って新しい順に並べるので、その形の複合インデックス
create index if not exists trainings_genre_created_at_idx
  on public.trainings (genre, created_at desc);


-- ============================================================================
-- 2. categories.genre
--
-- trainings と同じ手順。既存6件はすべて 'body-play'。
-- ============================================================================

-- 2-1. default 付きで追加
alter table public.categories
  add column if not exists genre text default 'body-play';

-- 2-2. backfill の確認
update public.categories set genre = 'body-play' where genre is null;

do $$
declare
  remaining bigint;
begin
  select count(*) into remaining from public.categories where genre is null;
  if remaining > 0 then
    raise exception 'categories.genre が未設定の行が % 件あります。backfill を確認してください。', remaining;
  end if;
end
$$;

-- 2-3. default を外す
alter table public.categories
  alter column genre drop default;

-- 2-4. not null と CHECK
alter table public.categories
  alter column genre set not null;

alter table public.categories
  drop constraint if exists categories_genre_valid;

alter table public.categories
  add constraint categories_genre_valid
  check (genre in ('body-play', 'lifting'));

comment on column public.categories.genre is
  'このカテゴリーが属するジャンル。name / slug の一意性はジャンル単位（例: 体遊びとリフティングの両方に「バランス」を置ける）。';


-- ============================================================================
-- 3. categories の一意制約を張り替える（重要）
--
-- 変更前: name 全体で一意 / slug 全体で一意
-- 変更後: (genre, name) で一意 / (genre, slug) で一意
--
-- 理由: リフティング側にも「バランス」など体遊びと同じ name / slug を使いたい。
--       全体一意のままだと2つ目のジャンルで登録できなくなる。
--
-- 注意: 初期スキーマの列定義 `name text not null unique` が自動生成した制約名は
--       categories_name_key / categories_slug_key。これを落としてから張り直す。
-- ============================================================================

-- 3-1. 旧: 全体一意を外す
alter table public.categories drop constraint if exists categories_name_key;
alter table public.categories drop constraint if exists categories_slug_key;

-- 3-2. 新: ジャンル単位の一意を張る
--      unique の作り直しはインデックス再構築を伴うので、既にあるときは何もしない。
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.categories'::regclass
      and conname  = 'categories_genre_name_key'
  ) then
    alter table public.categories
      add constraint categories_genre_name_key unique (genre, name);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.categories'::regclass
      and conname  = 'categories_genre_slug_key'
  ) then
    alter table public.categories
      add constraint categories_genre_slug_key unique (genre, slug);
  end if;
end
$$;

-- 制約名はアプリ側 app/actions/categories.ts の unique 違反メッセージ変換が
-- 参照している（_name_key / _slug_key で判定）。名前を変えるときは両方直すこと。


-- ============================================================================
-- 4. RLS — 変更不要
--
-- 既存ポリシーは
--   select : using (true)
--   insert / update / delete : public.is_admin()
-- のいずれかで、列を一切参照していない。列を1本足しても判定は変わらないため、
-- ポリシーの作り直しは不要（このセクションでは何もしない）。
--
-- grant も table 単位で与えてあり、列単位の grant は使っていないので、
-- 新しい列 genre にもそのまま適用される。
-- ============================================================================


-- ============================================================================
-- 5. リフティング用カテゴリーのシード
--
-- リフティングのカテゴリーが0件だと種目を登録できない（種目はカテゴリー1件以上
-- 必須）ため、この2件は必ず入れる。slug で冪等。
-- ============================================================================

insert into public.categories (genre, name, slug, sort_order) values
  ('lifting', 'トラップ',       'trap',    1),
  ('lifting', 'コントロール',   'control', 2)
on conflict (genre, slug) do nothing;


-- ============================================================================
-- 6. 適用結果の確認（失敗したらここで止まる）
-- ============================================================================

do $$
declare
  lifting_categories bigint;
  body_play_trainings bigint;
  other_genre_trainings bigint;
begin
  -- 旧「全体一意」が残っていると、リフティング側に体遊びと同じ name / slug を
  -- 作れない。名前違いで drop が空振りしていないかここで気づけるようにする。
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.categories'::regclass
      and contype  = 'u'
      and conname not in ('categories_genre_name_key', 'categories_genre_slug_key')
  ) then
    raise exception 'categories にジャンル単位でない一意制約が残っています。pg_constraint を確認してください。';
  end if;

  select count(*) into lifting_categories
    from public.categories where genre = 'lifting';

  if lifting_categories < 2 then
    raise exception 'リフティングのカテゴリーが % 件しかありません（2件必要）。', lifting_categories;
  end if;

  select count(*) into body_play_trainings
    from public.trainings where genre = 'body-play';
  select count(*) into other_genre_trainings
    from public.trainings where genre <> 'body-play';

  raise notice 'ジャンルを追加しました。既存種目 % 件を body-play に設定（それ以外のジャンル % 件）。リフティングのカテゴリー % 件。',
    body_play_trainings, other_genre_trainings, lifting_categories;
end
$$;
