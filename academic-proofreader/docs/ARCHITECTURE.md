# Architecture — Scientific Paper Authoring Environment

学術英語校正アプリを「科学論文オーサリング環境」へ拡張するための全体設計。
フェーズ0〜5の実装はすべてこのドキュメントを基準に行う。

## 技術スタック

| レイヤ | 技術 | 備考 |
|---|---|---|
| フロントエンド | Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 | 既存を継続 |
| AIエンジン | Google Gemini API via `@google/genai` | 旧 `@google/generative-ai` は2025-11-30に非推奨化。モデルIDは `src/config/models.ts` に集約し環境変数で差し替え可能 |
| 構造化出力 | `responseMimeType: "application/json"` + `responseSchema` | プロンプト内の緩いJSON指示に依存しない。スキーマは `src/schemas/` で定義 |
| 認証・DB | Supabase (Auth + PostgreSQL + RLS) | 原稿をDB保存し端末非依存に。localStorageはオフライン時の一時保存として併用 |
| 文献API | Crossref / Semantic Scholar / PubMed | すべて公開API。サーバーサイドから呼び出し |
| 課金(将来) | Stripe | フェーズ5でインターフェースのみ用意 |

### AIキーの取り扱い

- `GEMINI_API_KEY` はサーバーサイド (API Route) のみで使用。`NEXT_PUBLIC_` プレフィックスを付けない。
- Supabaseの `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` はRLS前提の公開可能キー。
- フロントからのDB読み書きはRLS(row-level security)で `auth.uid()` により自分の行のみに制限。

## ディレクトリ構成(目標形)

```
academic-proofreader/
├── docs/
│   └── ARCHITECTURE.md          ← 本ドキュメント
├── supabase/
│   └── migrations/
│       └── 0001_init.sql        ← フェーズ0: 全テーブル + RLS
├── src/
│   ├── config/
│   │   ├── models.ts            ← GeminiモデルID定数(環境変数で上書き可)
│   │   ├── env.ts               ← 型付き環境変数アクセス・設定判定
│   │   └── limits.ts            ← レート制限・無料枠/有料枠の定義
│   ├── types/
│   │   ├── api.ts               ← 各API Routeのリクエスト/レスポンス型
│   │   └── db.ts                ← DB行の型(テーブルと1:1)
│   ├── schemas/
│   │   └── gemini.ts            ← Gemini responseSchema定義(機能ごと)
│   ├── lib/
│   │   ├── ai/
│   │   │   └── gemini.ts        ← サーバー専用Geminiクライアントラッパ
│   │   ├── supabase/
│   │   │   └── client.ts        ← ブラウザ用クライアント(未設定ならnull)
│   │   ├── repo/
│   │   │   └── cloudSync.ts     ← DB⇔localStorage同期レイヤ
│   │   ├── rateLimit.ts         ← レート制限(スライディングウィンドウ)
│   │   ├── serverAuth.ts        ← BearerトークンからのSupabaseユーザー解決
│   │   ├── journalProfiles.ts   ← 既存(フェーズ4で拡張)
│   │   ├── storage.ts           ← 既存localStorage層(オフラインキャッシュ)
│   │   └── ...                  ← 既存の diff/prompt/docx 等
│   ├── context/
│   │   └── AppContext.tsx       ← 認証状態・クラウド同期を追加
│   ├── components/
│   │   ├── auth/AuthPanel.tsx   ← ログイン/サインアップ(フェーズ0)
│   │   ├── drafting/            ← フェーズ1: アウトライン/ドラフト/Phrasebank
│   │   ├── references/          ← フェーズ2: 文献管理・引用
│   │   ├── quality/             ← フェーズ3: チェックリスト・統計・ステートメント
│   │   ├── export/              ← フェーズ4: LaTeX/Markdown/テンプレート
│   │   └── ...                  ← 既存の proofread/sidebar 等
│   └── app/
│       └── api/                 ← 下記「API Route一覧」参照
└── .env.example
```

## DBスキーマ(PostgreSQL / Supabase)

全テーブル `user_id uuid references auth.users` を持ち、RLSで本人のみアクセス可。

```
profiles            id(=auth.users.id), display_name, plan('free'|'pro'), created_at
documents           id, user_id, title, journal_id, style_preset_id,
                    body_text, caption_text, reviewer_comments_text, updated_at, created_at
document_versions   id, document_id, user_id, mode('body'|'caption'),
                    original_text, revised_text, corrections jsonb,
                    consistency_issues jsonb, journal_id, style_preset_id, created_at
"references"        id, user_id, document_id(null可), csl jsonb(CSL-JSON),
                    doi, title, authors_text, year, source('bibtex'|'ris'|'crossref'|
                    'semantic-scholar'|'pubmed'|'manual'), created_at
comments            id, user_id, document_id, target_type('correction'|'global'),
                    target_label, body, created_at
whitelist_terms     id, user_id, term, preset_id, created_at    (user_id+term でunique)
usage_events        id, user_id(null可=匿名), route, model, input_tokens,
                    output_tokens, created_at                    (フェーズ5の計測基盤)
```

設計メモ:
- `document_versions.corrections` はJSONBのまま保持(校正結果の構造は今後も変わりうるため正規化しない)。
- `"references"` はPostgreSQLの予約語のためクォート必須。supabase-jsの `.from('references')` はそのまま動く。
- CSL-JSONを正とし、BibTeX/RIS/各文献APIからのインポートはすべてCSL-JSONへ正規化して保存(フェーズ2)。
- 剽窃チェック等の外部サービス連携はDBに持たずインターフェースのみ(フェーズ5)。

## API Route一覧

認証はオプショナルなBearerトークン(`Authorization: Bearer <supabase access_token>`)。
トークンがあればユーザー単位、なければIP単位でレート制限。
DBのCRUD(documents等)はAPI Routeを経由せず、ブラウザからsupabase-js+RLSで直接行う。

| Route | フェーズ | 入出力 | AI |
|---|---|---|---|
| POST /api/proofread | 0(既存改修) | 本文+設定 → 校正JSON | Gemini構造化 |
| POST /api/cover-letter | 0(既存改修) | 原稿+ジャーナル → レター文 | Geminiテキスト |
| POST /api/reviewer-response | 0(既存改修) | 査読コメント → 回答文 | Geminiテキスト |
| POST /api/draft/outline | 1 | 研究メモ → IMRaD骨子JSON | Gemini構造化 |
| POST /api/draft/section | 1 | セクション+修辞役割 → 下書き | Geminiテキスト |
| POST /api/draft/paraphrase | 1 | 選択範囲+目標語数 → 言い換えJSON | Gemini構造化 |
| POST /api/references/import | 2 | BibTeX/RIS → CSL-JSON配列 | なし(パーサ) |
| GET  /api/references/search | 2 | クエリ → Crossref/S2/PubMed統合結果 | なし(公開API) |
| POST /api/references/check | 2 | 本文+文献リスト → 未引用/引用漏れJSON | Gemini構造化 |
| POST /api/quality/checklist | 3 | ガイドラインID+本文 → 項目充足JSON | Gemini構造化 |
| POST /api/quality/stats | 3 | 本文 → 統計報告の問題点JSON | Gemini構造化 |
| POST /api/quality/statements | 3 | 入力フォーム → 各種ステートメント | Geminiテキスト |
| POST /api/quality/title-abstract | 3 | 現行タイトル/要旨 → 改善案JSON | Gemini構造化 |
| POST /api/quality/companion-docs | 3 | 原稿 → PLS/Highlights等 | Gemini構造化 |
| POST /api/export/latex | 4 | ドキュメントID/本文 → LaTeX | なし(変換) |
| POST /api/export/markdown | 4 | 同上 → Markdown | なし(変換) |
| GET  /api/usage | 5 | 自分の使用量集計 | なし |

## データフロー

```
┌──────────────── Browser ────────────────┐
│  AppContext (認証状態・原稿・校正結果)         │
│    │            │                        │
│    │ supabase-js│(RLS: 自分の行のみ)        │
│    │            ▼                        │
│    │      Supabase (Auth + PostgreSQL)   │
│    │            ▲                        │
│    │   オフライン時: localStorageに退避、     │
│    │   復帰時にcloudSyncが差分をpush         │
│    ▼                                     │
│  fetch /api/*  (Bearer access_token任意)  │
└─────┼────────────────────────────────────┘
      ▼
Next.js API Route (サーバー)
  ├─ rateLimit.ts   ユーザー/IP単位のレート制限
  ├─ serverAuth.ts  トークン→ユーザー解決(あれば)
  ├─ lib/ai/gemini.ts ──► Gemini API (responseSchema付き)
  ├─ 文献API (Crossref / Semantic Scholar / PubMed)
  └─ usage_events へ計測を記録(service roleまたは匿名スキップ)
```

## フェーズ計画と完了条件

| フェーズ | 内容 | 完了条件(動く状態) | 状態 |
|---|---|---|---|
| 0 | Supabase Auth/スキーマ/同期、Gemini移行、レート制限 | 未設定環境ではローカルモードで従来どおり動作。設定済み環境ではログイン→原稿がDB保存され別端末で復元 | ✅ 完了 |
| 1 | アウトライン生成・セクションドラフト・Phrasebank・言い換え | 執筆タブから各機能がGemini構造化出力で動く | ✅ 完了 |
| 2 | BibTeX/RISインポート・引用検索・引用チェック・書式整形 | 文献タブでインポート→検索→挿入→整形が一連で動く | ✅ 完了 |
| 3 | ガイドライン/統計チェック・ステートメント・最適化・付随文書 | 品質タブの各チェックがJSONで返りUI表示される | 未着手 |
| 4 | LaTeX/Markdownエクスポート・採番/相互参照・テンプレ整形 | エクスポートボタンからLaTeX/MDがダウンロードできる | 未着手 |
| 5 | 使用量計測・課金枠組み・外部チェック連携IF | usage_eventsが記録され無料枠超過時に429が返る | 未着手 |

### フェーズ2の実装メモ

- `src/lib/references/csl.ts` — CSL-JSON(https://citationstyles.org/)の最小サブセット型。フル仕様ではなく実際に使うフィールドのみだが、DBの`references.csl` jsonbカラムにもこの形で保存するため、将来 citeproc-js 等の本格的なCSLプロセッサに差し替える際もデータ移行なしで済む設計にしている。
- `src/lib/references/bibtex.ts` / `ris.ts` — 手書きのBibTeX/RISパーサ(外部npm依存なし)。ネストした`{{}}`や`"..."`引用符、複数著者の"and"区切りに対応。
- `src/lib/references/providers.ts` — Crossref / Semantic Scholar / PubMed への公開APIファンアウト(`Promise.allSettled`で1ソースの失敗が他をブロックしない)。
- `src/lib/references/formatters.ts` — Vancouver(numbered)/APA(author-date)/Nature(上付き番号)の**簡易フォーマッタ**(フルCSLプロセッサではない)。`journalProfiles.ts`の`citationStyleId`/`etAlMax`で切り替え。
- 引用順(`citationOrder`)はクライアント側で「初めて引用された順」を記録し、numbered系スタイルの採番と書式整形の並び順に使う。本文中の既存番号を後から自動リナンバリングする機能は未実装(スコープ外として明記)。

## 環境変数

```
GEMINI_API_KEY                 # サーバーのみ。必須(AI機能を使う場合)
GEMINI_MODEL                   # 任意。既定は config/models.ts の DEFAULT
NEXT_PUBLIC_SUPABASE_URL       # 任意。未設定ならローカルモード
NEXT_PUBLIC_SUPABASE_ANON_KEY  # 任意。同上
```

いずれも未設定でもアプリは起動する(該当機能が無効化されるだけ)。
```
