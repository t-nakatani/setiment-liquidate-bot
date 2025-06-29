
- ユーザの入力を待つ際には必ず、"say XXX"とsayコマンドを**実行**する(プレーンテキスト出力でなく実行する)

- 実行に時間のかかるコマンドの実行時には`gtimeout`を利用する
- 日本語での説明を中心とし、用語(flashloanなど)は英語併記で分かりやすく記述する
- contractをdeployした後はdeploy情報・結果をdeploy-log.mdに記載しておいて
- Interfaceを実装・設計する際は、docs/interface-design-principles.mdを参照してから進める
- plan outputは日本語で出力する
- マジックナンバーを使用せず、config管理か、ファイルの先頭に記載する

## 前提条件

- Chain: Hyper EVM
- Chain ID: 999
- RPC: https://rpc.hyperliquid.xyz/evm
- Native Token: $HYPE

## コントラクトアドレス

- Morpho: 0x68e37dE8d93d3496ae143F2E900490f6280C57cD

## docker compose

- USE `docker compose` NOT `docker-compose`
