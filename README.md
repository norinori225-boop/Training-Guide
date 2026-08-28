# ODORIKOトレーニング（トレーニングHowtoアプリ）

親子でできる体遊び・リフティングのトレーニングを紹介・共有するアプリです。

- **みんな**: ログイン不要で閲覧（入口でジャンルを選ぶ → 一覧・カテゴリー絞り込み・キーワード検索 → 詳細・チェックリスト）
- **管理者**: ログインするとトレーニングとカテゴリーを追加・編集・削除できる
- **動画**: YouTube（限定公開でOK）の URL を貼るとアプリ内で再生
- **画像**: Supabase Storage に保存
- **お気に入り**: ログイン不要。**この端末のブラウザにだけ**保存されます（端末間では共有されません）

技術スタック: Next.js 16（App Router / TypeScript）/ Tailwind CSS v4 / Supabase（Postgres・Auth・Storage）/ Zod / Vercel

---

## セットアップ

### 1. Supabase プロジェクトを作る

https://supabase.com でプロジェクトを作成（リージョンは Tokyo / Northeast Asia 推奨）。

### 2. 管理者ユーザーを作る

1. Authentication → Users → **Add user**（Auto Confirm User を有効にすると確認メール不要）
2. 作ったユーザーを開き、**`app_metadata`** を次のように編集して保存

```json
{ "role": "admin" }
```

> ⚠️ **`user_metadata` ではなく `app_metadata`** に入れること。`user_metadata` は本人が書き換えられるため、権限の根拠には使えません。このアプリの管理者判定はこの1か所だけで決まります（アプリ側の `requireAdmin()` も DB 側の RLS も、同じ `app_metadata.role` を見ています）。

3. （任意）Authentication → Providers → Email で「Allow new users to sign up」をオフにすると、勝手にアカウントを作られません。**アプリにサインアップ画面はありません。**

### 3. Storage バケットを作る

Storage → New bucket → 名前 **`training-images`** / **Public bucket にチェック**。

（マイグレーションにも保険の `insert ... on conflict` が入っているので、作り忘れていても public として作成されます）

### 4. マイグレーションを適用する

`supabase/migrations/20260816120000_init.sql` に、テーブル・RLS・Storage ポリシー・シードデータがすべて入っています。何度実行しても同じ結果になる（冪等）ように書いてあるので、失敗したら直して再実行して構いません。

**方法A: ダッシュボードの SQL Editor（おすすめ・CLI 不要）**

1. Supabase ダッシュボード → **SQL Editor** → **New query**
2. 上記 SQL ファイルの中身を**全部**コピーして貼り付け → **Run**
3. 「破壊的な操作を含む」という警告が出ますが、`drop policy if exists` などを含むクエリすべてに出る定型の注意です。初回は消えるものがないのでそのまま実行して構いません
4. `Success. No rows returned` と出れば成功（最後が INSERT なので返る行はありません）

**方法B: Supabase CLI**

```bash
npx supabase link --project-ref <プロジェクトID>
npx supabase db push
```

適用後、Table Editor に `categories`（6件）/ `trainings`（8件）/ `training_categories` が見えれば成功です。

> `supabase/migrations/` にはこのあと **`20260826090000_add_genre.sql`（ジャンル追加）**、**`20260828090000_add_equipment_other.sql`（その他の道具名）** が入っています。ファイル名の日付順に適用してください。詳しい手順と検証SQLは[ジャンル追加の適用手順（STEP 7-1）](#ジャンル追加の適用手順step-7-1)と[その他の道具名の適用手順（修正2 その1）](#その他の道具名の適用手順修正2-その1)にあります。

### 5. 環境変数を設定する

```bash
cp .env.local.example .env.local
```

`.env.local` を開いて値を入れます。Supabase の **Project Settings → API** から取得できます。

| 変数名 | 用途 | Vercel に設定する？ |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | **する** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon（publishable）キー。ブラウザに配られる公開前提のキーで、安全性は RLS 側で担保する | **する** |
| `SUPABASE_SERVICE_ROLE_KEY` | RLS をすり抜ける管理者キー。**シードスクリプト専用** | **しない** |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` はアプリのリクエスト処理では一切使っていません（`grep` で確認済み）。本手順ではシードも SQL に含めているため、**この値は空のままで構いません**。1本で全テーブルを読み書きできてしまうキーなので、Vercel にも設定しないでください。

---

## 開発

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint
```

管理画面は `http://localhost:3000/admin`（未ログインならログイン画面へリダイレクトされます）。

---

## Vercel へのデプロイ

### 1. GitHub にリポジトリを作って push する

```bash
git init
git add .
git commit -m "アジリティートレーニング共有アプリ MVP"
git branch -M main
git remote add origin https://github.com/<ユーザー名>/<リポジトリ名>.git
git push -u origin main
```

`.env.local` は `.gitignore` 済みなので push されません。

### 2. Vercel でインポートする

1. https://vercel.com → **Add New… → Project**
2. GitHub の該当リポジトリを **Import**
3. Framework Preset は **Next.js** が自動検出されます。Build Command / Output Directory は既定のままでOK

### 3. 環境変数を設定する（デプロイ前に必ず）

**Settings → Environment Variables** で次の2つを追加します。Production / Preview / Development すべてにチェックを入れてください。

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<プロジェクトID>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon（publishable）キー |

> ⚠️ **`SUPABASE_SERVICE_ROLE_KEY` は絶対に追加しないでください。** ローカルのシード用途専用です。

### 4. Deploy

**Deploy** を押すと `https://<プロジェクト名>.vercel.app` が発行されます。以降は `main` に push するたびに自動で再デプロイされます。

### 5. デプロイ後の確認

- トップページにトレーニングが並ぶ（並ばない場合は環境変数の設定漏れ）
- `/admin` にアクセスするとログイン画面へリダイレクトされる
- 管理者アカウントでログインして追加・編集ができる
- スマホでURLを開いて表示崩れがないか

Supabase 側で追加設定は不要です（anon キーはドメインを問わず使えます。書き込みの可否は RLS が判断します）。

---

## 設計メモ

### 画面構成

| URL | 内容 |
|---|---|
| `/` | 入口。ジャンルを選ぶ3つのボタンと使い方 |
| `/list/[genre]` | ジャンル別の一覧。検索・カテゴリー絞り込みはこのジャンル内で閉じる |
| `/favorites` | お気に入り（端末内保存・ジャンル混在） |
| `/training/[id]` | 種目の詳細 |

> 詳細は `/training/[id]`（単数）です。**`/trainings` という一覧パスは作りません。** 1文字違いで書き間違えたときに 404 としてしか現れず、原因が分かりにくいためです。ジャンル追加より前に共有された `/training/[id]` のリンクは、URL を変えていないのでそのまま開けます。

詳細の「もどる」は、アプリ内を辿ってきたならブラウザの履歴を戻り、共有リンクから直接開かれたときはその種目のジャンルの一覧へ送ります（`components/BackLink.tsx`）。

ジャンルが `body-play` / `lifting` 以外かどうかの検証は、`page.tsx` ではなく **`app/list/[genre]/layout.tsx`** で行っています。`loading.tsx` があるルートでは、page がレンダリングされる前にスケルトンと 200 のヘッダーが送信されてしまい、あとから `notFound()` を呼んでも**HTTP ステータスが 200 のまま**になるためです（画面は404でも、リンクチェッカーやクローラーには正常ページに見えてしまう）。layout は `loading.tsx` の外側で動くので、送信前に弾いて 404 を返せます。

### ジャンルとカテゴリーの関係

分類は2段になっています。

| 段 | 例 | 追加のしかた |
|---|---|---|
| **ジャンル**（上位・固定） | 体遊びトレーニング / リフティングトレーニング | コードで固定。`lib/constants.ts` の `GENRE_CODES` と DB の CHECK 制約を直す |
| **カテゴリー**（下位・可変） | 速く走る / バランスをとる / トラップ | 管理画面から追加・編集・削除できる |

**ジャンルを増やすにはコードの変更が必要です。**管理画面からは追加・削除・改名できません（3つ目以降のジャンル追加は今回のスコープ外です）。増やす場合の手順は下の「ジャンルを増やすには」を参照してください。

カテゴリーの `name` と `slug` の一意性は**ジャンル単位**です。体遊びとリフティングの両方に「バランス」を置けるようにするため、全体一意ではなく `(genre, name)` / `(genre, slug)` で一意にしています。

`trainings.genre` と `categories.genre` に **DB の default はありません**。ジャンル追加時の backfill が終わったあと意図的に外してあり、以後の insert はジャンルの明示指定が必須です（入れ忘れが not null 違反として表に出るようにするため）。

### ジャンルを増やすには

ジャンルはコードで固定しています。増やすときは次の4か所を直します。1〜2を漏らすと型エラーで気づけますが、3を忘れると保存時に DB の CHECK 制約で弾かれます。

1. `lib/constants.ts` の `GENRE_CODES` にコード値を足す
2. 同ファイルの `GENRE_LABELS` / `GENRE_SHORT_LABELS` / `GENRE_ICONS` / `GENRE_DESCRIPTIONS` を埋める（`Record<GenreCode, string>` なので、埋め忘れると**型エラーになります**）
3. DB の CHECK 制約を直す（新しいマイグレーションで `trainings_genre_valid` と `categories_genre_valid` を貼り替える）
4. そのジャンルのカテゴリーを最低1件、カテゴリー管理から登録する（**0件だと種目を1件も登録できません**）

入口画面のボタン・管理画面のジャンルタブ・ジャンル別一覧はすべて `GENRE_CODES` から組み立てているので、**画面側の改修は不要**です。

### 管理画面とジャンル

追加・編集フォームは**全ジャンルのカテゴリーを受け取り**、選択中のジャンルで絞って表示します（タブを切り替えるたびにサーバーへ取りに行かないため）。ジャンルを切り替えると選択済みカテゴリーはクリアされます（確認ダイアログあり）。

ジャンルとカテゴリーの整合は**サーバー側でも検証**します（`app/actions/trainings.ts` の `loadSelectedCategories`）。画面が正しい選択肢しか出さないことに依存せず、フォームを迂回した POST でもジャンル違いの組み合わせを弾きます。検証は**種目の行を作る前**に行います — あとで弾くと、カテゴリーが1件も付いていない種目だけが残ってしまうためです。

なお、`training_categories` にジャンル違いの組み合わせを入れさせない制約は **DB 側には無く**、このアプリ側の検証が唯一の防波堤です（複合外部キーを張るには `categories` と `trainings` の主キー構成を変える必要があるため、今回は見送っています）。

管理一覧とカテゴリー管理のジャンル絞り込みは URL の `?genre=` に持たせています。保存して戻ってきたときに同じタブが開いたままになり、「＋新しいトレーニング」も絞り込み中のジャンルを初期選択で引き継げます。

### 選択肢の定義は1か所だけ

**ジャンル・強度・道具・対象年齢・推奨人数の定義は `lib/constants.ts` が唯一の置き場所です。** DB のコード値（`low` / `ladder` など）と表示名（`弱` / `ラダー` など）の対応はすべてここで管理し、他のファイルに表示名をハードコードしません。DB の CHECK 制約もこの値と一致させてあります。

キーワード検索では、このファイルの逆引き関数で検索語をコード値に変換してから突き合わせます（「ラダー」→ `ladder`）。

### バリデーション

`lib/schemas.ts` の Zod スキーマを、フォーム（クライアント）と Server Action の両方で共用しています。エラーメッセージはすべて日本語です。

### 権限とセキュリティ

書き込みは3層で守っています。

1. `middleware.ts` — 未認証の `/admin/*` アクセスをログイン画面へ
2. `requireAdmin()` — すべての書き込み系 Server Action の先頭で `app_metadata.role === 'admin'` を検証
3. **RLS** — DB 側の `public.is_admin()` が最終防衛線。アプリを迂回して API を直接叩いても書き込めません

セッション判定には `getSession()` ではなく **`getUser()`** を使っています（Supabase 側でトークンを検証するため、Cookie を書き換えただけでは突破できません）。

### データ構造

- カテゴリーは**多対多**（`training_categories`）。「主カテゴリー」という概念は持ちません。`sort_order` は保存時に `categories.sort_order` の昇順で 0 から機械採番します
- `checklist` は `text[]` カラム。件数上限（20件）と文字数はアプリ側（Zod）で検証します
- `equipment` は `text[]` のコード値。**`'other'` を選んだときだけ** `equipment_other`（1〜30文字）に道具名が入り、選んでいなければ必ず `null`。この対応は DB の CHECK 制約で担保しています
- 一覧は種目数によらず2クエリ固定（カテゴリーを join でまとめて取得し、N+1 にしません）

### お気に入り（端末内保存）

利用者ログインは導入していません。お気に入りは **その端末のブラウザの中だけ**に保存され、サーバーにも Supabase にも一切送りません。したがって**別の端末・別のブラウザ・シークレットウィンドウでは空**になり、ブラウザの閲覧履歴（サイトデータ）を消すと失われます。この注意書きは `/favorites` の画面にも出しています。

保存先は **`localStorage` の `favorites:v1`** で、トレーニングの id だけを配列で持ちます（登録順・新しいものが先頭）。題名などのコピーは持たせません — 管理画面で直しても古い情報が残り続けてしまうためです。

読み書きは **`lib/favorites.ts` に集約**し、画面からは `localStorage` を直接触りません。将来サーバー保存へ差し替えるときは、このファイルだけを書き換えれば画面側は変えずに済みます。読み書きはすべて try/catch で囲んであり、プライベートウィンドウなどで例外が出る環境では「0件」として普通に動きます（保存されないだけで、画面は壊れません）。

React へは `useSyncExternalStore` で渡しています。SSR とハイドレーション中は `null`（＝読み込み前）を返すのでサーバーとクライアントで出力がズレず、ハートが一瞬未選択に見えてから点灯するチラつきが起きません。ストアを共有しているので、ハートを押すとお気に入りページの一覧や入口の件数バッジも一緒に更新されます。

お気に入りページは、サーバーで全ジャンルの種目を取得し、クライアントで id 配列に一致するものだけを表示します。**取得結果に無い id（削除された種目）は表示せず、`localStorage` からも取り除きます**（自己修復）。

### サムネイルの3段フォールバック

`thumbnail_url` → YouTube 自動サムネイル → プレースホルダー、の順に表示します。URL が入っていても画像が実在するとは限らない（動画が削除された等）ため、読み込みエラーでも次の段へ落ちるようにしてあります。

### シードデータについて

シードの `youtube_url` は `SAMPLE00001` のような**ダミーの動画ID**です。形式は正しいので URL 解析のテストにはなりますが、実在しないため**再生とサムネイル取得は失敗し、プレースホルダーが表示されます**。ご自身の限定公開動画の URL に差し替えてお使いください。

シードは `trainings` が空のときだけ実行されます。入れ直したい場合は先に `delete from public.trainings;` を実行してください（`training_categories` は cascade で消えます）。

---

## ジャンル追加の適用手順（STEP 7-1）

`supabase/migrations/20260826090000_add_genre.sql` は、**すでに本番データが入っている状態**に「ジャンル」を足すためのマイグレーションです。既存行は消さず、すべて `body-play`（体遊びトレーニング）に寄せます。

このファイルがやること:

1. `trainings.genre` を追加（default 付き）→ backfill 確認 → **default を外す** → not null + CHECK → `(genre, created_at desc)` のインデックス作成
2. `categories.genre` を同じ手順で追加
3. `categories` の一意制約を **`name` / `slug` の全体一意から `(genre, name)` / `(genre, slug)` へ張り替え**
4. リフティング用カテゴリー2件（トラップ / コントロール）を投入
5. 適用結果の確認（想定と違えば `raise exception` で止まる）

**RLS の変更は不要です。** 既存ポリシーは `select` が `using (true)`、書き込みが `public.is_admin()` だけで、列を一切参照していません。列を1本足しても判定は変わらないため、ポリシーの作り直しは不要です。`grant` もテーブル単位なので、新しい列 `genre` にもそのまま効きます。

### 適用のしかた

1. Supabase ダッシュボード → **SQL Editor** → **New query**
2. `supabase/migrations/20260826090000_add_genre.sql` の中身を**全部**コピーして貼り付け → **Run**
3. 「破壊的な操作を含む」という警告が出ますが、`drop constraint if exists` を含むための定型の注意です
4. 成功すると `Success. No rows returned` と表示され、Results 下の **Notices** に「ジャンルを追加しました。既存種目 8 件を body-play に設定…」と出ます

途中でエラーになった場合は、直して**そのまま再実行して構いません**（何度実行しても同じ結果になるように書いてあります）。

### 検証SQL

適用後、SQL Editor に貼って確認してください。

#### 検証A: 既存の種目が全て body-play になっているか

```sql
select genre, count(*) from public.trainings group by genre order by genre;
```

→ `body-play` が既存の種目数（初期シードのままなら **8**）、それ以外の行が無ければ成功です。

```sql
select count(*) as ng from public.trainings where genre is null or genre <> 'body-play';
```

→ **`0`** になるのが正しい動作です。

#### 検証B: リフティングのカテゴリーが2件入っているか

```sql
select genre, sort_order, name, slug
from public.categories
where genre = 'lifting'
order by sort_order;
```

→ `1 / トラップ / trap` と `2 / コントロール / control` の **2行**が返れば成功です。既存6件は `genre = 'body-play'` のまま残っています。

```sql
select genre, count(*) from public.categories group by genre order by genre;
```

→ `body-play` = 6、`lifting` = 2。

#### 検証C: genre の default が外れているか

```sql
select table_name, column_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('trainings', 'categories')
  and column_name = 'genre';
```

→ 2行とも `is_nullable = NO` / **`column_default = NULL`**（空欄）になるのが正しい動作です。`'body-play'::text` が残っていたら default が外れていません。

#### 検証D: ジャンル指定なしの insert が失敗するか

```sql
-- どちらもエラーになるのが正しい
insert into public.categories (name, slug, sort_order)
values ('ジャンル無し', 'no-genre', 99);

insert into public.trainings
  (title, intensity, short_description, description, equipment, age_groups, people)
values
  ('ジャンル無し', 'low', 'x', 'x', array['none'], array['lower'], 'solo');
```

→ どちらも **`null value in column "genre" ... violates not-null constraint`** になれば成功です。default が残っていると**エラーにならずに登録されてしまう**ので、ここが一番確実な確認になります。

#### 検証E: 未定義のジャンルを弾くか

```sql
insert into public.categories (genre, name, slug, sort_order)
values ('soccer', 'NG', 'ng-genre', 99);
```

→ **`violates check constraint "categories_genre_valid"`** になるのが正しい動作です。

#### 検証F: 一意制約がジャンル単位になっているか

```sql
begin;
-- リフティング側に、体遊びと同じ name / slug を作れる（= 成功するのが正しい）
insert into public.categories (genre, name, slug, sort_order)
values ('lifting', 'バランスをとる', 'balance', 99);

-- 同じジャンル内での重複は弾かれる（= エラーになるのが正しい）
insert into public.categories (genre, name, slug, sort_order)
values ('lifting', 'トラップ', 'trap', 98);
rollback;  -- ロールバックするので実際には残りません
```

制約名も確認できます。

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.categories'::regclass and contype = 'u';
```

→ `categories_genre_name_key UNIQUE (genre, name)` と `categories_genre_slug_key UNIQUE (genre, slug)` の2件だけ。旧 `categories_name_key` / `categories_slug_key` が残っていないことも確認してください。

### 適用したあとの注意

`genre` に default が無いので、**管理画面の新規登録フォームがジャンルを送るようになるまで、種目とカテゴリーの新規登録は not null 違反で失敗します**（閲覧・編集・削除は今までどおり動きます）。フォーム側の対応は次のステップです。

---

## その他の道具名の適用手順（修正2 その1）

`supabase/migrations/20260828090000_add_equipment_other.sql` は、必要な道具の【その他】に**道具名を自由入力できるようにする**ためのマイグレーションです。道具のコード値（`none` / `ladder` / `cone` / `ball` / `other`）の仕組みは変えません。

このファイルがやること:

1. `trainings.equipment_other`（text・null 許可）を追加
2. **既存データの backfill**（制約を張る前に必ず実行）
   - `equipment` に `'other'` を含むのに名前が無い行 → 仮の名前 `その他の道具` を入れる
   - `'other'` を含まないのに名前が残っている行 → `null` に戻す（再実行のための保険。初回では発生しません）
3. 制約を2本追加
   - `trainings_equipment_other_length` … null でなければ前後の空白を除いて1〜30文字
   - `trainings_equipment_other_consistent` … `'other'` を選んだときだけ値が入る
4. 適用結果の確認（想定と違えば `raise exception` で止まる）

**backfill を先にやる理由**: すでに `'other'` を含む種目があると、整合性チェックを付けた瞬間に violation で失敗します。仮の名前を入れて制約を満たす状態にしてから張ります。仮の名前はあとから管理画面で正しい道具名に直す前提の暫定値です。

**RLS の変更は不要です。** 既存ポリシーは `select` が `using (true)`、書き込みが `public.is_admin()` だけで、列を一切参照していません。`grant` もテーブル単位なので、新しい列 `equipment_other` にもそのまま効きます。

### 適用のしかた

1. Supabase ダッシュボード → **SQL Editor** → **New query**
2. `supabase/migrations/20260828090000_add_equipment_other.sql` の中身を**全部**コピーして貼り付け → **Run**
3. 成功すると `Success. No rows returned` と表示され、Results 下の **Notices** に「equipment_other を追加しました。'other' を含む種目 N 件 …」と出ます

途中でエラーになった場合は、直して**そのまま再実行して構いません**（何度実行しても同じ結果になるように書いてあります）。

### 検証SQL

適用後、SQL Editor に貼って確認してください。

#### 検証ア: `'other'` と `equipment_other` の対応が取れているか（いちばん大事）

```sql
select
  count(*) filter (where 'other' = any(equipment))            as with_other,
  count(*) filter (where equipment_other is not null)         as with_name,
  count(*) filter (where equipment_other = 'その他の道具')     as placeholder,
  count(*) filter (
    where ('other' = any(equipment)) <> (equipment_other is not null)
  )                                                            as ng
from public.trainings;
```

→ `with_other` と `with_name` が**同じ数**、`ng` が **`0`** なら成功です。`placeholder` は仮の名前のまま残っている件数なので、管理画面から正しい道具名に直していってください。

#### 検証イ: 行ごとの中身を目で見る

```sql
select id, title, equipment, equipment_other
from public.trainings
where 'other' = any(equipment) or equipment_other is not null
order by title;
```

→ `equipment` に `other` が入っている行だけが並び、すべて `equipment_other` に値が入っていること。

#### 検証ウ: 列とコメントができているか

```sql
select
  column_name, data_type, is_nullable,
  col_description('public.trainings'::regclass, ordinal_position) as comment
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'trainings'
  and column_name  = 'equipment_other';
```

→ `text` / `YES`（null 許可）/ コメント「道具に 'other' を選んだときの自由入力欄。…」の1行。

#### 検証エ: 制約が2本とも付いているか

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.trainings'::regclass
  and conname like 'trainings_equipment_other%'
order by conname;
```

→ `trainings_equipment_other_consistent` と `trainings_equipment_other_length` の **2行**。

#### 検証オ: 制約が実際に効いているか（4パターンとも失敗するのが正解）

いずれも `new row ... violates check constraint` で弾かれれば成功です。**`rollback` まで必ず実行してください**（テスト行を残さないため）。

```sql
-- ア) 'other' を含むのに名前が無い → trainings_equipment_other_consistent 違反
begin;
update public.trainings
set equipment = array['other']::text[], equipment_other = null
where id = (select id from public.trainings limit 1);
rollback;
```

```sql
-- イ) 'other' を含まないのに名前がある → trainings_equipment_other_consistent 違反
begin;
update public.trainings
set equipment = array['ladder']::text[], equipment_other = 'なわとび'
where id = (select id from public.trainings limit 1);
rollback;
```

```sql
-- ウ) 空白だけ → trainings_equipment_other_length 違反
begin;
update public.trainings
set equipment = array['other']::text[], equipment_other = '   '
where id = (select id from public.trainings limit 1);
rollback;
```

```sql
-- エ) 31文字 → trainings_equipment_other_length 違反
begin;
update public.trainings
set equipment = array['other']::text[], equipment_other = repeat('あ', 31)
where id = (select id from public.trainings limit 1);
rollback;
```

正常系（30文字ちょうど）が通ることも確認しておくと確実です。

```sql
begin;
update public.trainings
set equipment = array['other']::text[], equipment_other = repeat('あ', 30)
where id = (select id from public.trainings limit 1);
-- ここでエラーが出なければ成功
rollback;
```

### 適用したあとの注意

アプリ側（バリデーション・管理フォーム・表示・検索）はまだ `equipment_other` に対応していません。**この SQL を適用しただけの状態では、管理画面から道具に「その他」を選んで保存すると、`trainings_equipment_other_consistent` 違反で失敗します**（「その他」を使わない種目の登録・編集は今までどおり動きます）。アプリ側の対応は次のステップ（修正2 その2）です。

---

## 適用後の検証SQL

SQL Editor に貼って、RLS が意図どおり効いているかを確認できます。

### 検証1: 誰でも読める

```sql
begin;
set local role anon;
select count(*) as categories from public.categories;
select count(*) as trainings  from public.trainings;
rollback;
```

### 検証2: 未ログイン（anon）は書き込めない

```sql
begin;
set local role anon;
insert into public.trainings
  (title, intensity, short_description, description, equipment, age_groups, people)
values
  ('侵入テスト', 'low', 'テスト', 'テスト', array['none'], array['lower'], 'solo');
rollback;
```

→ **`new row violates row-level security policy` というエラーになるのが正しい動作です。**

### 検証3: ログイン済みでも admin でなければ書き込めない

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{}}', true);
select public.is_admin();  -- false になるはず

insert into public.categories (name, slug, sort_order)
values ('侵入テスト', 'intrusion-test', 99);
rollback;
```

### 検証4: admin なら書き込める

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"role":"admin"}}', true);
select public.is_admin();  -- true になるはず

insert into public.categories (name, slug, sort_order) values ('検証用', 'verify-temp', 99);
rollback;  -- ロールバックするので実際には残りません
```

### 検証5: CHECK 制約が効いている

```sql
-- どれもエラーになるのが正しい
insert into public.trainings (title, intensity, short_description, description, equipment, age_groups, people)
values ('NG', 'low', 'x', 'x', array[]::text[], array['lower'], 'solo');        -- 道具0件

insert into public.trainings (title, intensity, short_description, description, equipment, age_groups, people)
values ('NG', 'low', 'x', 'x', array['none','ladder'], array['lower'], 'solo');  -- none と併用

insert into public.trainings (title, intensity, short_description, description, equipment, age_groups, people)
values ('NG', 'saikyou', 'x', 'x', array['none'], array['lower'], 'solo');       -- 未定義の強度
```

### 検証6: 使用中カテゴリーは削除できない

```sql
delete from public.categories where slug = 'run';
```

→ `violates foreign key constraint` になるのが正しい動作です（`on delete restrict`）。

---

## 今回のスコープ外

以下は意図的に実装していません。

ページネーション／無限スクロール、全文検索や日本語表記ゆれ吸収、道具・年齢・人数での絞り込みUI、複数カテゴリーのAND絞り込み、下書き・公開ステータス、ソフトデリート、監査ログ、楽観ロック・同時編集制御、Storage孤立ファイルの完全なGC、レート制限・CAPTCHA、E2Eテストの網羅、i18n、実施履歴。**お気に入りの端末間同期**（＝利用者ログイン）も入れていません。
