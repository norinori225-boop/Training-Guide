-- ============================================================================
-- アジリティートレーニング共有アプリ — 初期スキーマ
--
-- 適用方法: Supabase ダッシュボード → SQL Editor にこのファイルの中身を
--           全部貼り付けて Run（詳しくは README.md を参照）
--
-- このファイルは何度実行しても同じ結果になる（冪等）ように書いてあります。
-- シードデータは trainings が空のときだけ投入されます。
-- ============================================================================

create extension if not exists pgcrypto;


-- ============================================================================
-- 1. 管理者判定
--
-- 管理者かどうかは Supabase Auth の app_metadata.role === 'admin' だけで決める。
-- profiles や admin_emails のような追加テーブルは作らない。
-- user_metadata は本人が書き換えられるため、権限判定には絶対に使わないこと。
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

comment on function public.is_admin() is
  'ログイン中ユーザーの app_metadata.role が admin かどうか。全テーブルの RLS がこれを見る。';


-- ============================================================================
-- 2. updated_at 自動更新トリガー
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================================
-- 3. テーブル
-- ============================================================================

-- ---- categories ------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),

  constraint categories_slug_format check (slug ~ '^[a-z0-9-]+$')
);

comment on table public.categories is 'トレーニングの分類マスタ。表示順は sort_order 昇順。';
comment on column public.categories.slug is 'URL・コード用。^[a-z0-9-]+$。作成後は変更しない。';


-- ---- trainings -------------------------------------------------------------
create table if not exists public.trainings (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  intensity         text not null,
  short_description text not null,
  description       text not null,
  equipment         text[] not null,
  age_groups        text[] not null,
  people            text not null,
  checklist         text[] not null default '{}',
  youtube_url       text,
  thumbnail_url     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint trainings_intensity_valid
    check (intensity in ('low', 'mid', 'high')),

  constraint trainings_people_valid
    check (people in ('solo', 'pair', 'group')),

  -- 1件以上 / 定義済みコード値のみ / NULL要素なし /
  -- 'none'（道具なし）を含む場合は要素数1のみ
  constraint trainings_equipment_valid
    check (
      cardinality(equipment) >= 1
      and array_position(equipment, null) is null
      and equipment <@ array['none', 'ladder', 'cone', 'ball', 'other']::text[]
      and (not ('none' = any (equipment)) or cardinality(equipment) = 1)
    ),

  -- 1件以上 / 定義済みコード値のみ / NULL要素なし
  constraint trainings_age_groups_valid
    check (
      cardinality(age_groups) >= 1
      and array_position(age_groups, null) is null
      and age_groups <@ array['preschool', 'lower', 'upper']::text[]
    )
);

comment on table public.trainings is 'トレーニング種目。コード値の定義は lib/constants.ts と一致させること。';
comment on column public.trainings.checklist is
  '実施時のチェック項目。件数上限（20件）と各項目の文字数はアプリ側(Zod)で検証する。';

-- cardinality() を使うのは、空配列に対して array_length() が NULL を返し、
-- CHECK 制約が NULL のとき「違反していない」と判定されて空配列を通してしまうため。

drop trigger if exists trainings_set_updated_at on public.trainings;
create trigger trainings_set_updated_at
  before update on public.trainings
  for each row
  execute function public.set_updated_at();


-- ---- training_categories（多対多）-------------------------------------------
-- 「主カテゴリー」という概念は持たない。
-- sort_order は保存時に categories.sort_order の昇順で 0 から機械採番する。
create table if not exists public.training_categories (
  training_id uuid not null references public.trainings(id)  on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  sort_order  int  not null default 0,

  primary key (training_id, category_id)
);

comment on table public.training_categories is
  'トレーニングとカテゴリーの多対多。category_id は on delete restrict（使用中カテゴリーは削除不可）。';


-- ---- インデックス ----------------------------------------------------------
create index if not exists training_categories_category_id_idx
  on public.training_categories (category_id);

create index if not exists trainings_created_at_idx
  on public.trainings (created_at desc);


-- ============================================================================
-- 4. RLS
--
-- 方針: 読み取りは全員に開放（ログイン不要で閲覧できるアプリのため）。
--       書き込みはログイン済み かつ is_admin() のときだけ。
-- ============================================================================

alter table public.categories          enable row level security;
alter table public.trainings           enable row level security;
alter table public.training_categories enable row level security;

-- テーブルレベルの権限（実際の可否は上の RLS ポリシーが決める）
grant select on public.categories, public.trainings, public.training_categories
  to anon, authenticated;
grant insert, update, delete on public.categories, public.trainings, public.training_categories
  to authenticated;


-- ---- categories ------------------------------------------------------------
drop policy if exists categories_select_public on public.categories;
create policy categories_select_public on public.categories
  for select to anon, authenticated
  using (true);

drop policy if exists categories_insert_admin on public.categories;
create policy categories_insert_admin on public.categories
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists categories_update_admin on public.categories;
create policy categories_update_admin on public.categories
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists categories_delete_admin on public.categories;
create policy categories_delete_admin on public.categories
  for delete to authenticated
  using (public.is_admin());


-- ---- trainings -------------------------------------------------------------
drop policy if exists trainings_select_public on public.trainings;
create policy trainings_select_public on public.trainings
  for select to anon, authenticated
  using (true);

drop policy if exists trainings_insert_admin on public.trainings;
create policy trainings_insert_admin on public.trainings
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists trainings_update_admin on public.trainings;
create policy trainings_update_admin on public.trainings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists trainings_delete_admin on public.trainings;
create policy trainings_delete_admin on public.trainings
  for delete to authenticated
  using (public.is_admin());


-- ---- training_categories ---------------------------------------------------
drop policy if exists training_categories_select_public on public.training_categories;
create policy training_categories_select_public on public.training_categories
  for select to anon, authenticated
  using (true);

drop policy if exists training_categories_insert_admin on public.training_categories;
create policy training_categories_insert_admin on public.training_categories
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists training_categories_update_admin on public.training_categories;
create policy training_categories_update_admin on public.training_categories
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists training_categories_delete_admin on public.training_categories;
create policy training_categories_delete_admin on public.training_categories
  for delete to authenticated
  using (public.is_admin());


-- ============================================================================
-- 5. Storage（バケット training-images）
--
-- バケットは STEP 0 で手動作成済みの想定。念のため public 設定を保証する。
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('training-images', 'training-images', true)
on conflict (id) do update set public = true;

drop policy if exists training_images_select_public on storage.objects;
create policy training_images_select_public on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'training-images');

drop policy if exists training_images_insert_admin on storage.objects;
create policy training_images_insert_admin on storage.objects
  for insert to authenticated
  with check (bucket_id = 'training-images' and public.is_admin());

drop policy if exists training_images_update_admin on storage.objects;
create policy training_images_update_admin on storage.objects
  for update to authenticated
  using (bucket_id = 'training-images' and public.is_admin())
  with check (bucket_id = 'training-images' and public.is_admin());

drop policy if exists training_images_delete_admin on storage.objects;
create policy training_images_delete_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'training-images' and public.is_admin());


-- ============================================================================
-- 6. シードデータ
--
-- カテゴリーは slug で冪等。トレーニングは「まだ1件も無いとき」だけ投入する。
-- ============================================================================

insert into public.categories (name, slug, sort_order) values
  ('速く走る',        'run',              1),
  ('すばやく切り返す', 'change-direction', 2),
  ('バランスをとる',   'balance',          3),
  ('合図に反応する',   'react',            4),
  ('リズム・足さばき', 'rhythm',           5),
  ('跳ぶ・着地する',   'jump',             6)
on conflict (slug) do nothing;


do $$
begin
  if exists (select 1 from public.trainings) then
    raise notice 'trainings に既存データがあるため、シード投入をスキップしました。';
    return;
  end if;

  -- ---- トレーニング本体 ----------------------------------------------------
  insert into public.trainings
    (title, intensity, short_description, description, equipment, age_groups, people, checklist, youtube_url, thumbnail_url)
  values
    (
      'まっすぐダッシュ 10メートル',
      'mid',
      'コーンからコーンまで、全力でまっすぐ走ります。',
      'スタート地点とゴール地点にコーンを置き、その間の約10メートルを全力で走ります。' ||
      '走る前に「よーい」で止まり、合図が出てから走り出すのがポイントです。' ||
      'ゴールで急に止まると転びやすいので、ゴールを通りすぎてからゆっくり止まりましょう。' ||
      '3〜5本くらい走ったら、しっかり休んでから次に進みます。',
      array['cone'],
      array['preschool', 'lower', 'upper'],
      'pair',
      array['合図が出るまでスタートしない', 'うでを大きくふる', 'ゴールを通りすぎてから止まる'],
      'https://www.youtube.com/watch?v=SAMPLE00001',
      null
    ),
    (
      'ラダーで足ぶみジャンプ',
      'mid',
      'ラダーのマスに合わせて、リズムよく足を運びます。',
      '地面にラダーを広げ、1マスに片足ずつ、トントンとリズムよく足を入れていきます。' ||
      'はじめはゆっくり、正しく踏めるようになってから少しずつ速くします。' ||
      '目線は下を向きすぎず、前を見ながらできるようになるのが目標です。' ||
      'ラダーがないときは、地面にテープや線を引いても同じ練習ができます。',
      array['ladder'],
      array['lower', 'upper'],
      'solo',
      array['1マスに1歩ずつ入れる', 'かかとをつけずにつま先で弾む', 'なれてきたら少しずつ速くする'],
      'https://youtu.be/SAMPLE00002',
      null
    ),
    (
      'コーンをまわってUターン',
      'high',
      'コーンまで走って、素早く向きを変えてもどります。',
      '5メートルほど先にコーンを1つ置き、そこまで走ってコーンをまわり、スタート地点まで戻ります。' ||
      '切り返すときは、コーンの手前で歩幅を小さくして減速するのがコツです。' ||
      'ひざを内側に入れず、つま先とひざを同じ向きにして曲がりましょう。' ||
      '左回り・右回りの両方を同じ回数やると、体のバランスが良くなります。',
      array['cone'],
      array['lower', 'upper'],
      'solo',
      array['コーンの手前で歩幅を小さくする', 'ひざとつま先を同じ向きにする', '左回りと右回りを同じ回数やる'],
      null,
      null
    ),
    (
      '片足バランス 10秒',
      'low',
      '片足で立って、10秒間ぐらつかずにキープします。',
      '両手を広げて片足で立ち、10秒数えます。倒れそうになったら足をついて、もう一度やり直しましょう。' ||
      '目線を1か所に決めて見つめると、ぐらつきにくくなります。' ||
      'できるようになったら、目をつぶって挑戦したり、立っている足を少し曲げたりして難しくします。' ||
      '運動の前後どちらに入れてもよい、いちばん取り組みやすい種目です。',
      array['none'],
      array['preschool', 'lower'],
      'solo',
      array['目線を1か所に決める', '左右それぞれ10秒ずつ', 'ふらついたら足をついて仕切り直す'],
      'https://www.youtube.com/shorts/SAMPLE00004',
      null
    ),
    (
      'まねっこストップ＆ゴー',
      'mid',
      '大人の合図で「走る」「止まる」を切りかえます。',
      '大人が「ゴー」と言ったら走り出し、「ストップ」と言ったらその場でピタッと止まります。' ||
      '止まるときは足を肩幅くらいに開き、ひざを軽く曲げると安定します。' ||
      '慣れてきたら、手を上げたら走る・下げたら止まる、のように声を使わない合図にすると難しくなります。' ||
      '道具がいらないので、公園でも家の前でもすぐにできます。',
      array['none'],
      array['preschool', 'lower'],
      'pair',
      array['止まるときはひざを軽く曲げる', '合図をよく見る・よく聞く', 'ぶつからない広さでやる'],
      'https://www.youtube.com/watch?v=SAMPLE00005',
      null
    ),
    (
      'ケンケンパで着地れんしゅう',
      'mid',
      '片足・両足を切りかえながら、やわらかく着地します。',
      '「ケン（片足）・ケン（片足）・パ（両足）」のリズムで前に進みます。' ||
      '着地したときにドスンと音が鳴らないよう、ひざを曲げてやわらかく降りるのが目標です。' ||
      '地面にチョークで丸を描いたり、輪っかを置いたりすると分かりやすくなります。' ||
      'リズム・バランス・跳ぶ力をまとめて練習できる、欲張りな種目です。',
      array['none'],
      array['preschool', 'lower'],
      'solo',
      array['着地で音を立てない', 'ひざを曲げて衝撃を吸収する', '前を見ながら進む'],
      'https://youtu.be/SAMPLE00006',
      null
    ),
    (
      'しっぽ取りおにごっこ',
      'high',
      'しっぽを取られないように、走って逃げて切り返します。',
      'ズボンにタオルやハンカチを「しっぽ」としてはさみ、取られないように逃げ回ります。' ||
      'コーンで動ける範囲を区切ると、走りすぎずに切り返しの練習になります。' ||
      '1回30秒〜1分くらいで区切り、休みをはさみながら何回か行います。' ||
      '人数が多いほど盛り上がるので、家族や友だちみんなでどうぞ。',
      array['cone', 'other'],
      array['lower', 'upper'],
      'group',
      array['決めた範囲から出ない', 'ぶつかりそうなときは止まる', '30秒〜1分で区切って休む'],
      'https://www.youtube.com/watch?v=SAMPLE00007',
      null
    ),
    (
      'ミニサーキット（ラダー→コーン→ボール）',
      'high',
      'ラダー・コーン・ボールを続けてこなす、仕上げの種目です。',
      'ラダーで足さばき → コーンをまわって切り返し → 転がってきたボールをキャッチ、の順に続けて行います。' ||
      '1つずつの動きができるようになってから挑戦してください。' ||
      '順番を覚えるのも練習のうちなので、最初は歩きながら順路を確認しましょう。' ||
      '3セットくらいを目安に、間にしっかり休みを入れます。',
      array['ladder', 'cone', 'ball'],
      array['lower', 'upper'],
      'group',
      array['最初は歩いて順路を確認する', '1つずつの動きをていねいに', '3セットを目安に休みをはさむ', '疲れたらすぐ中止する'],
      'https://www.youtube.com/watch?v=SAMPLE00008',
      null
    );

  -- ---- カテゴリー紐づけ ----------------------------------------------------
  -- sort_order は categories.sort_order の昇順で 0 から機械採番する。
  with mapping (title, slug) as (
    values
      ('まっすぐダッシュ 10メートル',              'run'),

      ('ラダーで足ぶみジャンプ',                    'rhythm'),

      ('コーンをまわってUターン',                   'run'),
      ('コーンをまわってUターン',                   'change-direction'),

      ('片足バランス 10秒',                        'balance'),

      ('まねっこストップ＆ゴー',                    'change-direction'),
      ('まねっこストップ＆ゴー',                    'react'),

      -- 3カテゴリー持ち（カードの「＋N」表示の検証用）
      ('ケンケンパで着地れんしゅう',                'balance'),
      ('ケンケンパで着地れんしゅう',                'rhythm'),
      ('ケンケンパで着地れんしゅう',                'jump'),

      -- 3カテゴリー持ち
      ('しっぽ取りおにごっこ',                      'run'),
      ('しっぽ取りおにごっこ',                      'change-direction'),
      ('しっぽ取りおにごっこ',                      'react'),

      -- 3カテゴリー持ち
      ('ミニサーキット（ラダー→コーン→ボール）',   'run'),
      ('ミニサーキット（ラダー→コーン→ボール）',   'change-direction'),
      ('ミニサーキット（ラダー→コーン→ボール）',   'rhythm')
  )
  insert into public.training_categories (training_id, category_id, sort_order)
  select
    t.id,
    c.id,
    (row_number() over (partition by t.id order by c.sort_order) - 1)::int
  from mapping m
  join public.trainings  t on t.title = m.title
  join public.categories c on c.slug  = m.slug;

  -- ---- 取りこぼし検知 ------------------------------------------------------
  -- 上の対応表はタイトル文字列で突き合わせているため、打ち間違いがあると
  -- 「カテゴリーが1件も付かない種目」が静かにできてしまう。ここで気づけるようにする。
  if exists (
    select 1
    from public.trainings t
    where not exists (
      select 1 from public.training_categories tc where tc.training_id = t.id
    )
  ) then
    raise exception 'カテゴリーが1件も紐づかないトレーニングがあります。シードのタイトル対応表を確認してください。';
  end if;

  if exists (
    select 1
    from public.categories c
    where not exists (
      select 1 from public.training_categories tc where tc.category_id = c.id
    )
  ) then
    raise exception '種目が1件も紐づいていないカテゴリーがあります。シードの対応表を確認してください。';
  end if;

  raise notice 'シードデータを投入しました（カテゴリー6件 / トレーニング8件）。';
end
$$;
