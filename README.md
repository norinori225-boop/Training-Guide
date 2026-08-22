# アジリティートレーニング共有アプリ

親子でできるアジリティートレーニングを紹介・共有するアプリです。

- **みんな**: ログイン不要で閲覧（一覧・カテゴリー絞り込み・キーワード検索・詳細・チェックリスト）
- **管理者**: ログインするとトレーニングとカテゴリーを追加・編集・削除できる
- **動画**: YouTube（限定公開でOK）の URL を貼るとアプリ内で再生
- **画像**: Supabase Storage に保存

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

### 選択肢の定義は1か所だけ

**強度・道具・対象年齢・推奨人数の定義は `lib/constants.ts` が唯一の置き場所です。** DB のコード値（`low` / `ladder` など）と表示名（`弱` / `ラダー` など）の対応はすべてここで管理し、他のファイルに表示名をハードコードしません。DB の CHECK 制約もこの値と一致させてあります。

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
- 一覧は種目数によらず2クエリ固定（カテゴリーを join でまとめて取得し、N+1 にしません）

### サムネイルの3段フォールバック

`thumbnail_url` → YouTube 自動サムネイル → プレースホルダー、の順に表示します。URL が入っていても画像が実在するとは限らない（動画が削除された等）ため、読み込みエラーでも次の段へ落ちるようにしてあります。

### シードデータについて

シードの `youtube_url` は `SAMPLE00001` のような**ダミーの動画ID**です。形式は正しいので URL 解析のテストにはなりますが、実在しないため**再生とサムネイル取得は失敗し、プレースホルダーが表示されます**。ご自身の限定公開動画の URL に差し替えてお使いください。

シードは `trainings` が空のときだけ実行されます。入れ直したい場合は先に `delete from public.trainings;` を実行してください（`training_categories` は cascade で消えます）。

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

ページネーション／無限スクロール、全文検索や日本語表記ゆれ吸収、道具・年齢・人数での絞り込みUI、複数カテゴリーのAND絞り込み、下書き・公開ステータス、ソフトデリート、監査ログ、楽観ロック・同時編集制御、Storage孤立ファイルの完全なGC、レート制限・CAPTCHA、E2Eテストの網羅、i18n、PWA化、お気に入り・実施履歴。
