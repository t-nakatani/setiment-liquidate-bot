# Position Discovery Tool - v2.0

**イベント取得に特化したPositionDeployedスキャナー**

本ツールは、PositionManagerコントラクトが発行する`PositionDeployed`イベントを効率的に取得することに特化した、関心事分離によるクリーンアーキテクチャで再設計されたツールです。

## 🎯 主な改善点 (v2.0)

- **単一責任原則**: 各クラスが明確に分離された責任を持つ
- **イベント取得に集中**: 不要な機能を削除し、コア機能に特化
- **テスト可能性**: 依存性注入により各モジュールが独立してテスト可能
- **保守性の向上**: モジュール化により拡張・変更が容易

## 📁 アーキテクチャ

```
src/
├── core/                    # コア機能
│   ├── NetworkClient.js     # RPC通信とエラーハンドリング
│   ├── EventFilter.js       # イベントフィルタリング
│   └── EventScanner.js      # イベントスキャンロジック
├── exporters/               # データ出力
│   └── JsonExporter.js      # JSON出力
├── utils/                   # ユーティリティ
│   ├── ConfigLoader.js      # 設定ファイル管理
│   └── Logger.js            # ログ出力
└── cli/                     # コマンドライン
    └── ScanPositions.js     # CLIエントリーポイント
```

## 🚀 使用方法

### インストール

```bash
npm install
```

### 基本的な使用方法

```bash
# 最新1000ブロックをスキャン
npm run scan -- --latest 1000

# 特定のブロック範囲をスキャン
npm run scan -- --start-block 1000 --end-block 2000
```

### コマンドオプション

| オプション | 説明 | デフォルト |
|------------|------|------------|
| `--config` | 設定ファイルのパス | `./config.json` |
| `--start-block` | 開始ブロック番号 | `0` |
| `--end-block` | 終了ブロック番号 | 必須 |
| `--latest` | 最新N個のブロックをスキャン | - |
| `--help` | ヘルプを表示 | - |

## ⚙️ 設定

`config.json`で以下を設定できます：

```json
{
  "network": {
    "name": "Hyper EVM",
    "chainId": 999,
    "rpcUrl": "https://rpc.hypurrscan.io"
  },
  "contracts": {
    "positionManager": {
      "address": "0xE019Ce6e80dFe505bca229752A1ad727E14085a4"
    }
  },
  "scanning": {
    "batchSize": 10000,
    "maxRetries": 3,
    "retryDelay": 1000,
    "rpcRequestInterval": 300
  }
}
```

## 📊 出力形式

### JSON出力例
```json
{
  "timestamp": "2025-06-28T07:30:00.000Z",
  "totalEvents": 2,
  "events": [
    {
      "eventName": "PositionDeployed",
      "blockNumber": 12345,
      "transactionHash": "0x...",
      "logIndex": 0,
      "args": {
        "position": "0x...",
        "caller": "0x...",
        "owner": "0x..."
      }
    }
  ]
}
```

## 🏗️ 開発

### クラス設計原則

1. **NetworkClient**: RPC通信の抽象化（リトライ、レート制限）
2. **EventFilter**: イベントフィルタリングとログ解析
3. **EventScanner**: イベントスキャンのコアロジック（出力に依存しない）
4. **JsonExporter**: JSON形式でのデータ出力
5. **CLI**: コマンドライン処理とオーケストレーション

### 旧バージョンからの移行

- 旧コードは `backup/` ディレクトリに保存されています
- 設定ファイルの形式は互換性があります
- 基本的なCLIオプションは同様に使用できます

## 📝 ライセンス

ISC