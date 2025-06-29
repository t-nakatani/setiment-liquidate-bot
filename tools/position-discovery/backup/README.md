# Position Discovery Tool

PositionManagerが発行する`PositionDeployed`イベントを過去に遡って発見するツールです。

## 概要

このツールは、Sentiment Protocol の PositionManager コントラクトで作成された全てのPositionを検索し、デプロイメント履歴を取得します。

### 主な機能

- **履歴検索**: 指定したブロック範囲または日付範囲でPositionDeployedイベントを検索
- **オーナー検索**: 特定のアドレスがオーナーのPositionのみを検索
- **バッチ処理**: 大量のブロックを効率的にスキャン
- **複数出力形式**: JSON、CSV形式での結果出力
- **統計情報**: スキャン結果の統計情報を表示
- **エラーハンドリング**: 自動リトライ機能付き

## 事前準備

### 1. 依存関係のインストール

```bash
npm install ethers
```

### 2. 設定ファイルの更新

`config.json` ファイルでPositionManagerアドレスを設定してください：

```json
{
  "contracts": {
    "positionManager": {
      "address": "0xYourPositionManagerAddress",
      "deploymentBlock": 123456
    }
  }
}
```

## 使用方法

### 基本的な使用方法

```bash
# 直近5000ブロックをスキャン (デフォルト)
node scan-positions.js

# 直近1000ブロックをスキャン
node scan-positions.js --blocks 1000

# 直近10000ブロックをスキャン
node scan-positions.js -n 10000
```

### 特定のオーナーで検索

```bash
# 特定のアドレスがオーナーのPositionのみ検索 (直近5000ブロック)
node scan-positions.js --owner 0x1234567890abcdef1234567890abcdef12345678

# オーナー検索で範囲を指定
node scan-positions.js --owner 0x1234... --blocks 20000
```

### 出力オプション

```bash
# JSON とCSV 両方で出力
node scan-positions.js --format json,csv

# カスタム出力ディレクトリ
node scan-positions.js --output ./my-results

# バッチサイズを調整（デフォルト: 1000）
node scan-positions.js --batch-size 500

# 大量のブロックを高速スキャン
node scan-positions.js --blocks 50000 --batch-size 2000
```

## コマンドラインオプション

| オプション | 短縮形 | 説明 | デフォルト | 例 |
|-----------|--------|------|----------|-----|
| `--blocks` | `-n` | 直近何ブロックをスキャンするか | 5000 | `--blocks 10000` |
| `--owner` | `-o` | オーナーアドレス | なし | `--owner 0x123...` |
| `--format` | | 出力フォーマット | json | `--format json,csv` |
| `--output` | | 出力ディレクトリ | ./output | `--output ./results` |
| `--batch-size` | `-b` | バッチサイズ | 1000 | `--batch-size 500` |
| `--help` | `-h` | ヘルプを表示 | | `--help` |

## 出力ファイル

### JSON 形式

```json
[
  {
    "blockNumber": 1234567,
    "blockHash": "0x...",
    "transactionHash": "0x...",
    "transactionIndex": 0,
    "logIndex": 0,
    "timestamp": 1640995200,
    "date": "2022-01-01T00:00:00.000Z",
    "position": "0x...",
    "caller": "0x...",
    "owner": "0x..."
  }
]
```

### CSV 形式

```csv
blockNumber,blockHash,transactionHash,transactionIndex,logIndex,timestamp,date,position,caller,owner
1234567,"0x...","0x...",0,0,1640995200,"2022-01-01T00:00:00.000Z","0x...","0x...","0x..."
```

## プログラマティック使用

```javascript
const PositionDeployedScanner = require('./position-deployed-scanner');

async function example() {
    const scanner = new PositionDeployedScanner('./config.json');
    await scanner.initialize();
    
    // ブロック範囲でスキャン
    const results = await scanner.scanEvents(1000000, 2000000);
    
    // 日付範囲でスキャン
    const dateResults = await scanner.scanByDateRange('2024-01-01', '2024-01-31');
    
    // 特定のオーナーで検索
    const ownerResults = await scanner.scanByOwner('0x123...');
    
    // 統計情報を表示
    scanner.showStatistics();
    
    // 結果を保存
    await scanner.saveResults('./output', ['json', 'csv']);
}
```

## 設定ファイル詳細

### config.json の構造

```json
{
  "network": {
    "name": "Hyper EVM",
    "chainId": 999,
    "rpcUrl": "https://rpc.hyperliquid.xyz/evm",
    "nativeToken": "HYPE"
  },
  "contracts": {
    "positionManager": {
      "address": "0x...",
      "deploymentBlock": 0
    }
  },
  "scanning": {
    "batchSize": 10000,
    "maxRetries": 3,
    "retryDelay": 1000,
    "rpcRequestInterval": 100,
    "defaultStartBlock": 0,
    "outputFormats": ["json", "csv"]
  }
}
```

## パフォーマンス考慮事項

- **バッチサイズ**: RPCプロバイダーの制限に応じて調整してください
- **レート制限**: RPCリクエスト間に自動的に100ms（0.1秒）の遅延を追加します
- **リトライ**: 一時的なネットワークエラーに対して自動リトライします
- **RPC間隔調整**: `config.json`の`rpcRequestInterval`で待機時間を変更可能（ミリ秒単位）

## トラブルシューティング

### 一般的なエラー

1. **"PositionManagerアドレスが設定されていません"**
   - `config.json` で正しいコントラクトアドレスを設定してください

2. **"Chain ID不一致"**
   - RPC URLとChain IDが一致しているか確認してください

3. **"無効なアドレス"**
   - アドレスフォーマットが正しいか確認してください（0x + 40文字の16進数）

### パフォーマンス問題

- バッチサイズを小さくしてみてください
- より安定したRPCプロバイダーを使用してください
- スキャン範囲を小さく分割してください

## ライセンス

MIT License

## 貢献

バグ報告や機能要求は、GitHubリポジトリのIssueでお知らせください。