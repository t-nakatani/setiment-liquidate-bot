# Plan Commits Command

## Usage
```
/plan-and-execute-commits
```

## Description
作業完了後に、適切な粒度と意味のある分け方でchunkされたcommitをplan・実行します。

## Implementation
1. `git status`と`git diff`で変更内容を確認
2. 変更を論理的にグループ化:
   - 新機能追加
   - バグ修正
   - リファクタリング
   - テスト追加
   - ドキュメント更新
   - 設定変更
3. 各チャンクごとに適切なcommit messageを生成
4. commit順序を最適化（依存関係を考慮）
5. 各commitのファイルリストを明示

## Commit Message Format
- feat: 新機能追加
- fix: バグ修正
- refactor: リファクタリング
- test: テスト追加
- docs: ドキュメント更新
- config: 設定変更
- style: コードスタイル修正

## Output Format
各commit planを以下の形式で出力:
```
Commit 1: [type]: [description]
Files: file1.js, file2.ts
Reason: [why these files belong together]

Commit 2: [type]: [description]
Files: file3.sol, file4.json
Reason: [why these files belong together]
```