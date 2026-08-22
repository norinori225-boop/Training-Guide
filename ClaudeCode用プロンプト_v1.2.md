# Claude Code 用プロンプト集 — アジリティートレーニングアプリ MVP

- バージョン: **v1.2**（2026-08-15）／ 要件定義書 v1.2 に対応
- 使い方: **STEP 0 は自分の手作業**。STEP 1 以降は、各ステップの「貼るプロンプト」をそのまま Claude Code に貼り、完了確認が通ってから次へ進む。
- 前提: まっさらな状態（Next.js プロジェクトも Supabase プロジェクトも未作成）から始める。

---

## STEP 0. 事前準備（自分の手作業・Claude Code は使わない）

Claude Code に渡す前に、これだけは人間側で済ませておく。

1. **Supabase プロジェクトを作成**（https://supabase.com）
   - リージョンは Tokyo（Northeast Asia）推奨
   - 作成後、Project Settings → API から次の3つを控える
     - `Project URL`
     - `anon public` キー
     - `service_role` キー（**シード投入専用。絶対に公開しない**）

2. **管理者ユーザーを作成**
   - Authentication → Users → 「Add user」→ 自分のメール＋パスワードで作成
   - 作成したユーザーを開き、**`app_metadata` を次のように編集して保存**

     ```json
     { "role": "admin" }
     ```

   - ⚠️ これがアプリ唯一の管理者権限の根拠。`user_metadata` ではなく **`app_metadata`** に入れること（`user_metadata` は本人が書き換えられるため権限判定に使えない）。

3. **Storage バケットを作成**
   - Storage → 「New bucket」→ 名前 `training-images` / **Public bucket にチェック**

4. **GitHub リポジトリを空で作成**（後で Vercel と連携するため。ローカルだけで進めるなら後回しでよい）

これで準備完了。以降は Claude Code に貼っていく。

---

## STEP 1. プロジェクトの土台をつくる

### 目的
Next.js プロジェクトの作成、Supabase クライアントの設定、**すべての画面が参照する定数と型**を先に置く。定数を最初に作るのが後の分岐を減らすコツ。

### 貼るプロンプト

```
アジリティートレーニング共有アプリ（親子向け）の MVP を作ります。今回は STEP 1「土台づくり」だけを実装してください。

## 技術スタック
- Next.js（App Router / TypeScript）
- Tailwind CSS
- Supabase（Postgres / Auth / Storage）※ @supabase/ssr を使用
- Zod
- デプロイ先は Vercel

## STEP 1 でやること

1. カレントディレクトリに Next.js プロジェクトを作成（App Router / TypeScript / Tailwind / ESLint あり、src ディレクトリなし、import alias は @/*）
2. 依存追加: @supabase/supabase-js, @supabase/ssr, zod
3. 以下のディレクトリ構成を用意する（空ファイルでよい部分は空でよい）

app/
  page.tsx
  training/[id]/page.tsx
  admin/page.tsx
  admin/login/page.tsx
  admin/new/page.tsx
  admin/[id]/edit/page.tsx
  admin/categories/page.tsx
  actions/
lib/
  constants.ts
  schemas.ts
  types.ts
  youtube.ts
  supabase/server.ts
  supabase/client.ts
components/
middleware.ts
supabase/migrations/

4. `lib/constants.ts` を作る。**アプリ内の選択肢の定義はこのファイルだけに置き、他のファイルはここを import する**（表示名のハードコード禁止）。

- 強度 INTENSITY: low→「弱」, mid→「中」, high→「強」
  バッジ色は low=緑 / mid=黄 / high=赤。ただし色だけで区別せず必ず文字も併記する。
- 道具 EQUIPMENT: none→「道具なし」, ladder→「ラダー」, cone→「コーン・マーカー」, ball→「ボール」, other→「その他」
- 対象年齢 AGE_GROUPS: preschool→「幼児」, lower→「小学校低学年」, upper→「小学校高学年」
- 推奨人数 PEOPLE: solo→「1人でできる」, pair→「2人」, group→「3人以上」

それぞれ「コード値の配列」「コード値→表示名のマップ」「表示名→コード値の逆引き関数」を export してください。逆引きは後でキーワード検索に使います（例: 検索語「ラダー」→ ladder）。

5. `lib/youtube.ts`: YouTube URL から動画IDを抽出する関数。`youtu.be/xxxx`, `youtube.com/watch?v=xxxx`, `youtube.com/shorts/xxxx` の3形式に対応。抽出できなければ null を返す。埋め込みURLとサムネイルURL（https://img.youtube.com/vi/{id}/hqdefault.jpg）を返すヘルパーも用意する。

6. `lib/supabase/server.ts` / `client.ts`: @supabase/ssr を使ったサーバー用・ブラウザ用クライアント。**service_role キーはアプリのリクエスト処理では絶対に使わない**（シードスクリプト専用）。

7. `.env.local.example` を作り、NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY を記載。`.gitignore` に .env.local が入っていることを確認。

8. `npm run build` が通ることを確認して終了。

まだ画面の中身やDBは作らないでください。STEP 2 以降で作ります。
```

### 完了確認
- `npm run dev` が起動する
- `lib/constants.ts` に4種類の選択肢がすべて入っている
- `.env.local` に STEP 0 で控えたキーを自分で書き込む（`.env.local.example` をコピー）

---

## STEP 2. データベース（スキーマ・RLS・シード）

### 目的
テーブル3つ、RLS、初期データを一気に作る。**ここの RLS を正しく作れるかがこのアプリの安全性そのもの**なので、必ず動作確認してから次へ。

### 貼るプロンプト

```
STEP 2「データベース」を実装してください。supabase/migrations/ に SQL ファイルとして作成します。

## テーブル

### categories
- id uuid PK default gen_random_uuid()
- name text not null unique（表示名）
- slug text not null unique（^[a-z0-9-]+$）
- sort_order int not null default 0
- created_at timestamptz not null default now()

### trainings
- id uuid PK default gen_random_uuid()
- title text not null
- intensity text not null（CHECK: 'low','mid','high'）
- short_description text not null
- description text not null
- equipment text[] not null（CHECK: 各要素が 'none','ladder','cone','ball','other' のいずれか、かつ array_length >= 1、かつ 'none' を含む場合は要素数1のみ）
- age_groups text[] not null（CHECK: 各要素が 'preschool','lower','upper' のいずれか、かつ array_length >= 1）
- people text not null（CHECK: 'solo','pair','group'）
- checklist text[] not null default '{}'（最大20件はアプリ側で検証）
- youtube_url text
- thumbnail_url text
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

updated_at は before update トリガーで now() に自動更新すること。

### training_categories（多対多）
- training_id uuid not null references trainings(id) on delete cascade
- category_id uuid not null references categories(id) on delete restrict
- sort_order int not null default 0
- PRIMARY KEY (training_id, category_id)

※「主カテゴリー」という概念は持ちません。sort_order は保存時に categories.sort_order の昇順で 0 から機械採番します。

インデックス: training_categories(category_id), trainings(created_at desc)

## RLS（重要）

管理者判定は Supabase Auth の app_metadata.role = 'admin' で行います。profiles や admin_emails のような追加テーブルは作らないでください。

```sql
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;
```

categories / trainings / training_categories の3テーブルすべてで RLS を有効化し、それぞれに以下4本のポリシーを作成:
- select: anon, authenticated に対して using (true)（誰でも読める）
- insert: authenticated に対して with check (public.is_admin())
- update: authenticated に対して using (public.is_admin()) with check (public.is_admin())
- delete: authenticated に対して using (public.is_admin())

Storage（バケット training-images、既に作成済み）:
- 読み取りは公開
- insert / update / delete は bucket_id = 'training-images' and public.is_admin()

## シードデータ

カテゴリー6件（sort_order の順に）:
1. 速く走る / run
2. すばやく切り返す / change-direction
3. バランスをとる / balance
4. 合図に反応する / react
5. リズム・足さばき / rhythm
6. 跳ぶ・着地する / jump

トレーニングは6件以上。条件:
- 各カテゴリーに最低1件が紐づくこと
- **少なくとも1件は3つ以上のカテゴリーを持つこと**（カードの「＋N」表示を検証するため）
- 道具は none / ladder / cone を最低1件ずつ使うこと
- youtube_url が未設定の種目、thumbnail_url も未設定の種目をそれぞれ1件は含めること（フォールバック検証のため）
- 内容は幼児〜小学生向けの実在しうる簡単なもので、説明とチェックリスト（2〜4項目）も日本語で埋めること

## 最後に
- migration を適用する手順（Supabase CLI もしくはダッシュボードの SQL Editor に貼る手順）を README に日本語で書いてください。
- 適用後に自分で確認するための検証SQL（RLS が効いているかを anon ロールで確認する例）も README に載せてください。
```

### 完了確認
- Supabase ダッシュボードの Table Editor に3テーブルとシードデータが見える
- SQL Editor で `set role anon; insert into trainings ...` を試すと**拒否される**
- ログインした管理者としてなら書き込める（STEP 5 以降で実地確認）

---

## STEP 3. 利用者側の画面（一覧・詳細）

### 目的
アプリの本体。認証がなくても動く部分なので、ここまでで「見られる状態」になる。

### 貼るプロンプト

```
STEP 3「利用者側の画面」を実装してください。認証は不要な範囲です。モバイル優先で作ってください。

## 共通のデータ取得方針

MVP の想定件数（〜100件）では1クエリで取得してサーバー側でフィルタします。N+1 クエリにしないこと。

```ts
supabase.from('trainings')
  .select('*, training_categories(sort_order, categories(id, name, slug, sort_order))')
  .order('created_at', { ascending: false })
  .limit(100)
```

ページネーションは作りません（100件到達時に将来対応）。

## 1. ホーム `/`（一覧）

種目カードを縦に並べる。カードの表示内容:
- サムネイル画像
  - **3段フォールバック**: thumbnail_url → YouTube自動サムネ（youtube_url から動画IDを抽出して https://img.youtube.com/vi/{id}/hqdefault.jpg）→ プレースホルダー画像
  - next/image を使う（画像の自動リサイズやWebP変換の自作は不要）
- 題名
- カテゴリー: **先頭2件まで**表示、3件以上なら「＋N」。順序はカテゴリーマスタの sort_order 順
- 強度バッジ: 色（弱=緑/中=黄/強=赤）＋**必ず文字も併記**
- 簡単な説明（short_description）
- 道具: **先頭2件まで**＋「＋N」（小さめのラベル）
- 対象年齢と推奨人数はカードには出さない（情報過多を防ぐため。詳細ページに出す）

上部に:
- **キーワード検索**（入力欄）
  - 検索対象: 題名 / 簡単な説明 / 詳しい説明 / カテゴリー名 / **道具の表示名**
  - 道具は DB にコード値（ladder 等）で入っているので、lib/constants.ts の逆引き関数で検索語をコード値に変換してから突き合わせること。「ラダー」で検索してヒットする必要があります
  - 小文字化して部分一致
- **カテゴリー絞り込みチップ**（「すべて」＋各カテゴリー、単一選択、横スクロール可）
  - 多対多なので「選択したカテゴリーを含む」種目を表示

その他:
- 検索・絞り込みの結果が0件のときは、空状態メッセージと「すべて表示に戻る」ボタンを出す
- カードタップで /training/[id] へ
- フッターに安全に関する注意書き（「無理せず、大人の見守りのもとで行ってください。体調が悪いときは中止してください。」）

## 2. 詳細 `/training/[id]`

- 動画: youtube_url があれば YouTube 埋め込み。なければ一覧と同じ3段フォールバックでサムネイル表示
- 題名 / **カテゴリーは全件表示** / 強度バッジ（文字併記）
- 情報行: **必要な道具（全件）／対象年齢の目安／推奨人数**（アイコンかラベル付きで見やすく）
- 詳しい説明
- チェックリスト: 利用者がタップでチェックできる。**状態は保存しない**（useState のみ。リロードで消えてよい）
- 安全に関する注意書きを常時表示
- 「もどる」導線
- 存在しない id は notFound() で404

## 共通
- 各ルートに loading.tsx と error.tsx を置く
- タップ領域は最低44px、画像には代替テキスト
- 一覧・詳細は動的レンダリングにする（App Router の既定キャッシュのまま静的化して、管理画面の変更が反映されない状態にしないこと）

実装後、npm run build が通ることを確認してください。
```

### 完了確認
- シードの6件が並んで見える
- 「ラダー」で検索してヒットする
- カテゴリーチップで絞り込める。**3カテゴリー持ちの種目が、どのチップからも出てくる**
- サムネなし種目でもレイアウトが崩れない
- スマホ幅（375px）で崩れない

---

## STEP 4. 管理者認証と保護ルート

### 目的
権限まわりを、CRUD を作る前に単体で固める。ここを後回しにすると RLS のデバッグが地獄になる。

### 貼るプロンプト

```
STEP 4「管理者認証」を実装してください。

## 方針
- 管理者判定は Supabase Auth の **app_metadata.role === 'admin'**
- 管理者ユーザーは Supabase ダッシュボードで手動作成済み。**アプリにサインアップ画面は作らないでください**
- 書き込みは必ず**ログインユーザーのセッション経由**（@supabase/ssr のサーバークライアント）で行い、RLS を実際に通すこと。service_role キーはシードスクリプト専用で、リクエスト処理では使わない

## 実装

1. `middleware.ts`
   - @supabase/ssr でセッションを更新（リフレッシュ）
   - `/admin/*`（`/admin/login` を除く）へ未認証でアクセスしたら `/admin/login` にリダイレクト

2. `/admin/login`
   - メール＋パスワードのログインフォーム
   - ログイン成功後は `/admin` へ
   - エラーは日本語で表示（「メールアドレスまたはパスワードが正しくありません」）
   - パスワードリセットは Supabase 標準メールに任せるので UI は作らない

3. 権限チェックの共通関数（例: `lib/auth.ts` の `requireAdmin()`）
   - サーバー側でセッションを取得し、`user.app_metadata.role === 'admin'` を検証
   - 管理系の Server Action / ページはすべてこれを通す

4. ログイン済みでも role が admin でない場合
   - `/admin/*` で「このアカウントには管理権限がありません」と表示し、**ログアウトボタン**を出す
   - 管理機能は一切実行できないこと

5. `/admin` に仮のページ（「トレーニング管理」の見出しとログアウトボタンだけ）を置く。一覧やCRUDは STEP 5 で作ります。

実装後、npm run build が通ることを確認してください。
```

### 完了確認
- 未ログインで `/admin` → ログインへ飛ぶ
- STEP 0 で作った管理者ユーザーでログインできる
- **試しに `app_metadata` を空にした別ユーザーを作ってログインすると、権限なし表示になる**（確認したら消してよい）
- ログアウトできる

---

## STEP 5. 管理者機能（トレーニングCRUD・画像アップロード・カテゴリー管理）

### 目的
管理画面の本体。入力項目が多いので、バリデーションを Zod に集約させるのがポイント。

### 貼るプロンプト

```
STEP 5「管理者機能」を実装してください。すべて requireAdmin() を通し、書き込みはログインセッション経由（RLS を通す）で行ってください。

## 1. バリデーション（`lib/schemas.ts` に集約）

Zod スキーマを1ファイルにまとめ、**クライアントと Server Action の両方で共用**すること。

- title: 必須・60文字以内
- short_description: 必須・120文字以内
- description: 必須・2000文字以内
- intensity: 'low' | 'mid' | 'high' 必須
- categoryIds: **1件以上必須**
- equipment: **1件以上必須**。'none' を含む場合は要素数1のみ
- age_groups: **1件以上必須**
- people: 'solo' | 'pair' | 'group' 必須
- checklist: 各項目60文字以内・最大20件（空文字は保存前に除去）
- youtube_url: 任意。入力された場合は lib/youtube.ts で動画IDが抽出できること。できなければ「YouTubeのURLの形式が正しくありません」
- category の slug: ^[a-z0-9-]+$。unique 違反は「そのslugは既に使われています」

Server Action は `{ ok: boolean, fieldErrors?: Record<string, string> }` の形で返し、フォーム上部にまとめて＋各項目の下にもエラーを表示すること。エラーメッセージはすべて日本語。

## 2. `/admin`（トレーニング管理一覧）

- 登録済みトレーニングの一覧（題名・カテゴリー・強度・更新日）
- 各行に「編集」「削除」ボタン。削除は確認ダイアログを挟む
- 「＋新しいトレーニング」ボタン

## 3. `/admin/new` と `/admin/[id]/edit`（共通フォームコンポーネント）

入力項目:
| 項目 | 形式 | 必須 |
|---|---|---|
| タイトル | テキスト | ○ |
| カテゴリー | チェックボックス複数選択 | ○（1件以上） |
| 強度 | ラジオ（弱/中/強） | ○ |
| 簡単な説明 | テキスト | ○ |
| 詳しい説明 | テキストエリア | ○ |
| 必要な道具 | チェックボックス複数選択 | ○（'道具なし' は排他制御。選ぶと他が外れる） |
| 対象年齢の目安 | チェックボックス複数選択 | ○ |
| 推奨人数 | ラジオ | ○ |
| チェックリスト | 可変個のテキスト入力（追加・削除・上下の並び替え、最大20件） | － |
| 動画URL | テキスト | － |
| サムネイル画像 | ファイルアップロード | － |

- 動画URLを入力すると**埋め込みプレビュー**を表示
- ［登録／更新］［キャンセル］

保存処理:
- trainings を upsert
- **training_categories は全削除→再挿入で置き換える**。sort_order は categories.sort_order の昇順で 0 から機械採番する
- 保存・削除の後に `revalidatePath('/')` と該当詳細ページの revalidate を呼び、**利用者側に即座に反映されるようにする**

## 4. 画像アップロード

- バケット: training-images（作成済み・公開読み取り）
- 受け付ける形式: image/jpeg, image/png, image/webp
- サイズ上限: **5MB**（超過時は日本語エラー）
- 保存パス: `${trainingId}/${uuid}.${ext}`
- 差し替え時・トレーニング削除時は旧オブジェクトの削除を試みるが、**失敗しても処理は継続**（ベストエフォート。孤立ファイルのGCは作り込まない）

## 5. `/admin/categories`（カテゴリー管理）

- 一覧: name / slug / sort_order / **使用中の種目数**
- 追加: name / slug / sort_order
- 編集: name と sort_order のみ（**slug は URL・コード用のため編集不可**）
- 削除: **使用中（種目が1件以上紐づく）カテゴリーは削除不可**。ボタンを無効化し「このカテゴリーを使っている種目があるため削除できません」と表示（DB 側も on delete restrict で二重に防ぐ）
- 並び替えはドラッグ&ドロップではなく sort_order の数値編集でよい

実装後、npm run build が通ることを確認してください。
```

### 完了確認
- 新規追加した種目が、**すぐに** `/` の一覧に出る
- カテゴリーを1つも選ばずに保存しようとするとエラーになる
- 「道具なし」を選ぶと他の道具が外れる
- 壊れた YouTube URL（例: `https://example.com/abc`）で保存するとエラーになる
- 6MB の画像でエラーになる
- 使用中のカテゴリーが削除できない

---

## STEP 6. 仕上げ・受け入れ基準チェック・デプロイ

### 目的
要件定義書 §11 のチェックリストを実際に通し、Vercel に載せる。

### 貼るプロンプト

```
STEP 6「仕上げとデプロイ」です。

## 1. 受け入れ基準の自己チェック

以下を1つずつ実際に確認し、**通ったもの／直したもの／通らなかったもの**を報告してください。コードの修正が必要な項目は修正してください。

利用者側:
- [ ] 一覧→カテゴリー絞り込み／検索→詳細（動画・説明・チェックリスト）まで閲覧できる
- [ ] 複数カテゴリーを持つ種目が、どのカテゴリーのチップからも表示される
- [ ] カードのカテゴリー・道具表示が3件以上でも崩れない（＋N が効く）
- [ ] 「ラダー」など道具の表示名で検索してヒットする
- [ ] 詳細ページに 道具・対象年齢・推奨人数 が表示される
- [ ] サムネイル未登録でも、YouTube自動サムネかプレースホルダーが出て崩れない
- [ ] 検索・絞り込みで0件のとき、空状態が正しく表示される
- [ ] 存在しない id の詳細ページで404になる
- [ ] 375px 幅でレイアウトが崩れない

管理者側:
- [ ] ログインしてトレーニングを追加・編集・削除できる
- [ ] カテゴリー0件では保存できない／道具0件・年齢0件でも保存できない
- [ ] 不正な YouTube URL は保存時にエラーになる
- [ ] カテゴリーの追加・編集ができ、使用中カテゴリーは削除できない
- [ ] 追加・編集した内容が即座に利用者側に反映される
- [ ] 画像アップロードと YouTube 埋め込みが機能する

権限:
- [ ] 未認証ユーザーは管理画面にアクセスできない／書き込みできない（RLS で担保）
- [ ] ログイン済みでも role != 'admin' のユーザーは書き込みできない（RLS で担保）

## 2. 仕上げ

- 全ルートに loading.tsx / error.tsx があるか確認
- metadata（title / description）を設定。OGP や SEO の作り込みは不要
- 強度バッジが色だけでなく文字でも区別できているか、画像に alt があるか、タップ領域が44px以上あるかを確認
- 未使用コード・未使用依存を削除
- README を日本語で整備:
  - セットアップ手順（Supabase プロジェクト作成 → 管理者ユーザーの app_metadata 設定 → バケット作成 → migration 適用 → .env.local）
  - 環境変数一覧
  - 開発・ビルド・デプロイの手順

## 3. デプロイ

Vercel へのデプロイ手順を README に書いてください。環境変数（NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY）を Vercel 側に設定する手順を含めること。**SUPABASE_SERVICE_ROLE_KEY は Vercel に設定しないでください**（シード専用でローカルのみ）。

## やらないこと（明示）
以下は今回のスコープ外です。実装しないでください:
ページネーション／無限スクロール、全文検索や日本語表記ゆれ吸収、道具・年齢・人数での絞り込みUI、複数カテゴリーのAND絞り込み、下書き・公開ステータス、ソフトデリート、監査ログ、楽観ロック・同時編集制御、Storage孤立ファイルの完全なGC、レート制限・CAPTCHA、E2Eテストの網羅、i18n、PWA化、お気に入り・実施履歴。
```

### 完了確認
- 受け入れ基準の報告を読み、通っていない項目があれば個別に指示して直す
- Vercel の URL でスマホから開いて確認

---

## 付録A. 詰まったときの投げ方

Claude Code が迷走したら、ステップ全体をやり直すより**症状を切り出して投げる**方が速い。

- **RLS で書き込みが弾かれる**
  → 「管理者でログインしているのに trainings への insert が RLS で拒否されます。`auth.jwt() -> 'app_metadata' ->> 'role'` の値を確認する SQL を出して、原因を切り分けてください。service_role でバイパスするのは禁止です」

- **管理画面の変更が一覧に出ない**
  → 「App Router のキャッシュで、管理画面での更新が `/` に反映されません。該当の Server Action に revalidatePath を追加するか、一覧を動的レンダリングにしてください」

- **一覧のクエリが遅い／N+1 になっている**
  → 「一覧取得が種目ごとにカテゴリーを取りに行っていないか確認し、`training_categories(categories(*))` を join した1クエリにまとめてください」

- **道具名で検索が当たらない**
  → 「DB には equipment がコード値（ladder 等）で入っています。lib/constants.ts の逆引き関数で検索語をコード値へ変換してから突き合わせてください」

## 付録B. 変更履歴

- v1.0（2026-08-12）: 初版。カテゴリー単一FK / checklist 別テーブル / profiles による管理者判定
- **v1.2（2026-08-15）: 要件定義書 v1.2 に対応**
  - カテゴリーを能力・目的別6分類に変更、**多対多**（training_categories）へ
  - **道具・対象年齢・推奨人数**を追加（すべて選択式・constants.ts に集約）
  - checklist を**配列カラム**に変更（checklist_items テーブル廃止）
  - 管理者判定を **app_metadata.role = 'admin'** に変更（環境変数の許可リストは RLS から参照できないため不採用）
  - サムネイル3段フォールバック、道具の表示名検索、revalidatePath、DB制約（CHECK・updated_atトリガー）、画像アップロード制約を明記
  - ステップ分割形式に再構成し、各ステップに完了確認を追加
