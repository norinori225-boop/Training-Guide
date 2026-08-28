-- ============================================================================
-- 必要な道具「その他」の自由入力（equipment_other）の追加 — 修正2 その1
--
-- 適用方法: Supabase ダッシュボード → SQL Editor にこのファイルの中身を
--           全部貼り付けて Run（詳しくは README.md「その他の道具名の適用手順」）
--
-- 目的:
--   道具に 'other' を選んだとき、その道具名を1つの自由入力欄に書けるようにする。
--   コード値（'none' / 'ladder' / 'cone' / 'ball' / 'other'）の仕組みは変えない。
--   表示・検索では 'other' の代わりにこの文字列を使う（アプリ側の対応は次の手順）。
--
-- 前提:
--   本番に既存データが入っている状態で実行する。既存行は消さない。
--   すでに 'other' を含む種目には、あとから管理画面で直せるよう仮の名前を入れる。
--
-- このファイルは何度実行しても同じ結果になる（冪等）ように書いてあります。
-- ============================================================================


-- ============================================================================
-- 1. 列の追加
--
-- null 許可なので、default 無しでそのまま足してよい（既存行は null で入る）。
-- ============================================================================

alter table public.trainings
  add column if not exists equipment_other text;

comment on column public.trainings.equipment_other is
  '道具に ''other'' を選んだときの自由入力欄。表示・検索ではコード値 ''other'' の代わりにこの文字列を使う';


-- ============================================================================
-- 2. 既存データの backfill（★ 制約を追加する「前」に必ず行う）
--
-- すでに equipment に 'other' を含む種目があると、下の整合性チェックを付けた
-- 瞬間に violation で失敗する。先に仮の名前を入れて、制約を満たす状態にする。
-- あとで管理画面から正しい道具名に直す前提の暫定値。
-- ============================================================================

-- 2-1. 'other' を含むのに名前が無い行 → 仮の名前を入れる
--      すでに名前が入っている行は上書きしない（再実行しても壊れない）
update public.trainings
set equipment_other = 'その他の道具'
where 'other' = any(equipment)
  and equipment_other is null;

-- 2-2. 逆向きのずれ: 'other' を含まないのに名前が残っている行 → 捨てる
--      初回適用では発生しないが、「その他」のチェックを外した状態が保存された
--      あとに再実行しても制約を張り直せるようにしておく。
update public.trainings
set equipment_other = null
where not ('other' = any(equipment))
  and equipment_other is not null;

-- 2-3. 文字数のはみ出しを先に知らせる
--      制約違反のそっけないエラーではなく、どの種目が問題かを出して止める。
do $$
declare
  bad_row record;
begin
  select id, title, char_length(btrim(equipment_other)) as len
    into bad_row
    from public.trainings
   where equipment_other is not null
     and char_length(btrim(equipment_other)) not between 1 and 30
   limit 1;

  if found then
    raise exception
      'equipment_other が1〜30文字に収まらない種目があります（id=%, title=%, %文字）。先に値を直してから再実行してください。',
      bad_row.id, bad_row.title, bad_row.len;
  end if;
end
$$;


-- ============================================================================
-- 3. 制約
--
-- drop → add の順にすることで、定義を変えたときも作り直せる（冪等）。
-- ============================================================================

-- 3-1. 文字数: null でなければ、前後の空白を除いて1〜30文字
--      「空白だけ」を弾きたいので char_length ではなく btrim してから数える。
alter table public.trainings
  drop constraint if exists trainings_equipment_other_length;

alter table public.trainings
  add constraint trainings_equipment_other_length
  check (
    equipment_other is null
    or char_length(btrim(equipment_other)) between 1 and 30
  );

-- 3-2. 整合性: equipment に 'other' を含むときだけ値が入る
--      （含むのに空 / 含まないのに値あり、の両方を1本で禁止する）
--      equipment は not null かつ NULL 要素を禁止済み（trainings_equipment_valid）
--      なので、左辺が NULL になって素通りすることはない。
alter table public.trainings
  drop constraint if exists trainings_equipment_other_consistent;

alter table public.trainings
  add constraint trainings_equipment_other_consistent
  check (
    ('other' = any(equipment)) = (equipment_other is not null)
  );


-- ============================================================================
-- 4. RLS — 変更不要
--
-- 既存ポリシーは select が using (true)、書き込みが public.is_admin() だけで、
-- 列を一切参照していない。grant もテーブル単位なので、新しい列にもそのまま効く。
-- ============================================================================


-- ============================================================================
-- 5. 適用結果の確認（想定と違えばここで止まる）
-- ============================================================================

do $$
declare
  with_other    bigint;  -- 'other' を含む種目
  with_name     bigint;  -- 名前が入っている種目
  placeholder   bigint;  -- 仮の名前のままの種目
  inconsistent  bigint;  -- 対応が取れていない種目（0 でなければ異常）
begin
  select
    count(*) filter (where 'other' = any(equipment)),
    count(*) filter (where equipment_other is not null),
    count(*) filter (where equipment_other = 'その他の道具'),
    count(*) filter (where ('other' = any(equipment)) <> (equipment_other is not null))
  into with_other, with_name, placeholder, inconsistent
  from public.trainings;

  if inconsistent > 0 then
    raise exception '''other'' と equipment_other の対応が取れていない種目が % 件あります。', inconsistent;
  end if;

  raise notice 'equipment_other を追加しました。''other'' を含む種目 % 件 / 名前あり % 件（うち仮の名前「その他の道具」のまま % 件）。仮の名前は管理画面から直してください。',
    with_other, with_name, placeholder;
end
$$;
