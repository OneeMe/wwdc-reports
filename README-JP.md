![WWDC Quick Look banner](assets/wwdc-quick-look-banner.png)

# WWDC Quick Look Skill

[README-中文](README-CN.md)
[README-English](README.md)
[README-日本語](README-JP.md)
[HomePage](https://wwdc-quick-look.swiftgg.team)

WWDC Quick Look は、Apple WWDC セッションのメタデータ、トランスクリプト、Code タブのスニペット、Resources リンクへすばやくアクセスするための、ローカルエージェント向け skill です。

skills.sh から 1 つのコマンドでインストールし、WWDC に関する質問で具体的なセッション根拠が必要になったときに、エージェントから `wwdc-quick-look` を使わせることができます。インストール可能な skill は、軽量な `SwiftGGTeam/wwdc-quick-look-skill` リポジトリに置かれています。このリポジトリには、その skill を支えるクローラー、Web サイト、公開データセットが含まれています。デフォルトの流れは local-first かつ no-key です。公開されている Apple Developer ページを読み取り、構造化 JSON と transcript テキストを書き出し、jsDelivr から最新アーカイブを配信します。

## skills.sh でインストール

```sh
npx skills add SwiftGGTeam/wwdc-quick-look-skill
```

skills CLI は独立した `SwiftGGTeam/wwdc-quick-look-skill` リポジトリからインストールするため、ユーザーがこの大きめのデータおよび Web サイト用リポジトリを clone する必要はありません。このリポジトリでは、ローカル開発用に同じ skill を `skills/wwdc-quick-look` の Git submodule として参照しています。

## この Skill でできること

ユーザーが WWDC セッション、Apple プラットフォームの発表、サンプルコード、デモプロジェクト、Code タブのスニペット、Resources リンク、トランスクリプトについて尋ねたときに、`wwdc-quick-look` を使います。

この skill では次のことができます。

- 利用可能な WWDC の年とトピックを一覧表示する
- セッションタイトル、説明、Resources、Code snippets を検索する
- リソース数とスニペット数を含むセッション概要を表示する
- ドキュメント、sample-code ページ、GitHub リポジトリ、デモプロジェクトなどの Resources リンクを表示する
- タイムスタンプとジャンプリンク付きで Code タブのスニペットを表示する
- ローカルまたは CDN 上の transcript テキストを読む

## リポジトリ構成

```text
skills/
└── wwdc-quick-look/          # Submodule: SwiftGGTeam/wwdc-quick-look-skill
    ├── SKILL.md
    ├── scripts/query.mjs
    └── references/data-schema.md

playground/
├── .agents/skills -> ../../skills
└── .claude/skills -> ../../skills

data/
├── index.json
├── wwdc20/
├── wwdc21/
├── wwdc22/
├── wwdc23/
├── wwdc24/
├── wwdc25/
└── wwdc26/
```

`skills/wwdc-quick-look` は、独立した skill リポジトリを指す submodule です。`playground` のリンクは、`.agents/skills` または `.claude/skills` を期待するエージェントランタイムに同じ skill を公開します。リポジトリルートには意図的に `.agents/skills` のコピーを置いていません。

## クエリスクリプトを直接使う

skill をインストールすると、エージェントがこのスクリプトを呼び出します。ローカルでのテストやデバッグでは、リポジトリルートから直接クエリを実行することもできます。

```sh
node skills/wwdc-quick-look/scripts/query.mjs list-years
node skills/wwdc-quick-look/scripts/query.mjs search --year 2026 --keyword "Foundation Models"
node skills/wwdc-quick-look/scripts/query.mjs show-session --year 2026 --code 339
node skills/wwdc-quick-look/scripts/query.mjs resources --year 2026 --code 339
node skills/wwdc-quick-look/scripts/query.mjs code --year 2026 --code 339 --limit 3
node skills/wwdc-quick-look/scripts/query.mjs transcript --year 2026 --code 339 --limit 20
```

デフォルトでは、クエリスクリプトは公開 CDN データセットを読み取ります。

```text
https://cdn.jsdelivr.net/gh/SwiftGGTeam/wwdc-quick-look@main/data/
```

ローカルテストでは、別のベース URL を指定できます。

```sh
WWDC_QUICK_LOOK_BASE_URL=http://127.0.0.1:8765 \
  node skills/wwdc-quick-look/scripts/query.mjs list-years
```

## データセットのカバレッジ

コミット済みのローカルデータセットは WWDC 2020 から WWDC 2026 までをカバーしています。

| 年 | セッション | 利用可能な transcripts | Resources 付きセッション | Code snippets 付きセッション |
|------|----------|-----------------------|--------------------------|-----------------------------|
| 2020 | 209 | 209 | 150 | 124 |
| 2021 | 202 | 202 | 176 | 127 |
| 2022 | 316 | 184 | 142 | 118 |
| 2023 | 316 | 181 | 122 | 100 |
| 2024 | 123 | 123 | 117 | 78 |
| 2025 | 122 | 122 | 113 | 81 |
| 2026 | 137 | 118 | 92 | 87 |

Apple Developer の一部の項目は、Q&A、Meet the Presenter、Study Hall、keynote、ASL、コミュニティ活動ページです。Apple がページ上でタイムスタンプ付き transcript を公開していない場合、manifest はテキストを作り出すのではなく、その項目を `missing` として記録します。

## アーカイブを更新する

データセットを保守するために、クローラーは引き続き利用できます。

```sh
# 1 年分を公開データディレクトリへクロールする。
node ./bin/wwdc-quick-look.js crawl --year 2026 --locale en --out-dir data/wwdc26

# 公開年カタログを再構築する。
node scripts/build-index.mjs
```

統合クロールは、公開されている Apple Developer の collection card を取得し、各セッションの詳細ページから Resources と Code タブのスニペットを補完し、transcript テキストファイルと manifest を書き出します。

データ更新は意図的に手動運用です。更新したい年についてローカルでクローラーを実行し、`data/index.json` を再構築し、diff を確認してから変更されたデータファイルをコミットしてください。

`data/` にコミットされるのは、安定した latest データのみです。年ごとの `raw_data.json`、transcript ファイル、transcript manifest、そして `data/index.json` が対象です。タイムスタンプ付きの `raw_data_*.json` スナップショットはローカルのクロール成果物であり、Git では無視されます。

## 公開 URL

```text
# 公開されている全年度のカタログ
https://cdn.jsdelivr.net/gh/SwiftGGTeam/wwdc-quick-look@main/data/index.json

# 年ごとのセッションメタデータ
https://cdn.jsdelivr.net/gh/SwiftGGTeam/wwdc-quick-look@main/data/wwdc26/raw_data.json

# Transcript manifest
https://cdn.jsdelivr.net/gh/SwiftGGTeam/wwdc-quick-look@main/data/wwdc26/transcripts-en/_manifest.json

# 単一 transcript
https://cdn.jsdelivr.net/gh/SwiftGGTeam/wwdc-quick-look@main/data/wwdc26/transcripts-en/339.txt
```

jsDelivr はパスをキャッシュします。バイト単位で安定したアーカイブ出力が重要な場合は、commit 固定の URL を使ってください。

## 開発

```sh
npm test
npm run check
node ./bin/wwdc-quick-look.js help
```

開発のためにこのリポジトリを clone した後は、`git submodule update --init --recursive` を実行して skill submodule を初期化してください。

このパッケージには実行時 npm 依存関係はなく、Node.js 20 以降が必要です。

## 法的事項

Apple、WWDC、Apple Developer、Swift、Xcode、iOS、macOS、watchOS、tvOS、visionOS は Apple Inc. の商標です。Apple のセッションメタデータ、transcripts、動画、画像、コードスニペット、関連リソースは、Apple またはそれぞれの権利者に帰属します。このリポジトリの MIT license は、このプロジェクトの独自コードとドキュメントのみを対象とします。

バナーアートワークは、このリポジトリのために生成された WWDC 風のプロジェクトブランディングです。Apple または WWDC の公式ロゴではありません。
