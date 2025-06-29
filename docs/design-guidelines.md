# 設計ガイドライン：過剰に複雑な設計を避けるために

## 概要

このドキュメントは、liquidator-v2の実装過程で学んだ教訓をもとに、今後の開発者が過剰に複雑な設計を避け、シンプルで理解しやすいコードを書くためのガイドラインです。

## 今回の経験からの学び

### 問題：初期設計の過剰な複雑さ
- 388行の詳細すぎる実装計画
- 使われない機能を大量に含んだinterface
- 予想される将来の要求を先行実装
- 複雑なエラーハンドリングとメトリクス

### 解決：簡素化による改善
- 実装されたコードは必要最小限の機能のみ
- 明確な責任分離
- 理解しやすいシンプルな構造

## 具体的な改善例

### 1. Interface設計の改善

**❌ 悪い例（初期設計）:**
```typescript
// 過剰に詳細なExecutionResult
export interface ExecutionResult {
  success: boolean;
  transactionHash?: string;
  gasUsed?: bigint;
  incentiveReceived?: bigint;
  error?: string;
  timestamp: number;
  candidate: LiquidationCandidate;
}

// メソッドが多すぎるinterface
export interface ILiquidationExecutor {
  executeLiquidations(candidates: LiquidationCandidate[]): Promise<ExecutionResult[]>
  executeSingle(candidate: LiquidationCandidate): Promise<ExecutionResult>
  estimateGasCost(candidate: LiquidationCandidate): Promise<bigint>
  validateExecution(candidate: LiquidationCandidate): Promise<boolean>
}
```

**✅ 良い例（最終設計）:**
```typescript
// シンプルで目的が明確
export interface ILiquidationExecutor {
  executeSingle(candidate: LiquidationCandidate): Promise<void>;
}
```

**学び：**
- interfaceは3個以下のメソッドに抑える
- 戻り値は必要最小限の情報のみ
- 詳細な結果情報は本当に必要になるまで実装しない

### 2. Entity設計の改善

**❌ 悪い例（ユーザーが削除したメソッド）:**
```typescript
export class LiquidationCandidate {
  // 使われないメソッドを大量に含んでいた
  toJson(): any { ... }
  static fromJson(data: any): LiquidationCandidate { ... }
  getPriority(): number { ... }
  getUrgency(): UrgencyLevel { ... }
  isStillValid(maxAgeMs: number): boolean { ... }
  calculateIncentive(): bigint { ... }
}
```

**✅ 良い例（最終設計）:**
```typescript
export class LiquidationCandidate {
  constructor(
    private readonly position: Position,
    private readonly healthFactor: HealthFactor,
    private readonly detectedAt: Timestamp,
  ) {}

  static create(position: Position, healthFactor: HealthFactor): LiquidationCandidate
  getPosition(): Position
  getHealthFactor(): HealthFactor
  getDetectedAt(): Timestamp
  equals(other: LiquidationCandidate): boolean
}
```

**学び：**
- getter以外のメソッドは本当に必要な時だけ追加
- JSON変換はAPIが必要になるまで実装しない
- validation、priority、urgencyなどの複雑な概念は避ける

### 3. Repository設計の改善

**❌ 悪い例（初期設計）:**
```typescript
// 過剰に複雑な検索機能
export interface IPositionQueryRepository {
  getPosition(borrower: string, marketId: string): Promise<Position | null>
  getAllPositions(): Promise<Position[]>
  queryPositions(criteria: PositionQuery): Promise<Position[]>
  getPositionsByHealthFactorRange(min: number, max: number): Promise<Position[]>
  getPositionsByMarket(marketId: string): Promise<Position[]>
  getPositionsByBorrower(borrower: string): Promise<Position[]>
  getRiskyPositions(maxHealthFactor: number, limit?: number): Promise<Position[]>
  getRecentlyUpdatedPositions(sinceMs: number): Promise<Position[]>
  getStats(): Promise<PositionStats>
  getMarketStats(marketId: string): Promise<MarketStats>
  getSyncMetadata(): Promise<SyncMetadata | null>
  healthCheck(): Promise<HealthCheckResult>
}
```

**✅ 良い例（最終設計）:**
```typescript
// シンプルで必要最小限
export interface IPositionQueryRepository {
  getAllPositions(): Promise<Position[]>
  getSyncMetadata(): Promise<SyncMetadata | null>
}
```

**学び：**
- 最初は`getAllPositions()`だけで十分
- 複雑な検索機能は必要になるまで追加しない
- 統計機能は監視が必要になるまで実装しない

### 4. Use Case設計の改善

**❌ 悪い例（複雑なオプション）:**
```typescript
export interface ScanOptions {
  maxHealthFactor?: number
  marketIds?: string[]
  minBorrowValue?: bigint
  excludeBorrowers?: string[]
  limit?: number
}

export interface LiquidationScanResult {
  candidates: LiquidationCandidate[]
  totalScanned: number
  scanDurationMs: number
  riskDistribution: Map<RiskLevel, number>
  marketBreakdown: Map<string, number>
}

export class LiquidationScanUseCase {
  async scanAllPositions(options?: ScanOptions): Promise<LiquidationScanResult>
  async scanMarket(marketId: MarketId, options?: ScanOptions): Promise<LiquidationScanResult>
  async scanBorrower(borrower: BorrowerAddress): Promise<LiquidationScanResult>
}
```

**✅ 良い例（最終設計）:**
```typescript
export class LiquidationScanUseCase {
  async scanAllPositions(): Promise<LiquidationCandidate[]>
  async continuousMonitoring(
    intervalMs: number,
    callback: (result: LiquidationCandidate[]) => void
  ): Promise<void>
}
```

**学び：**
- オプションパラメータは最小限に
- 戻り値は配列で十分、複雑な結果オブジェクトは不要
- 統計情報は本当に必要になるまで追加しない

### 5. Value Object設計の改善

**❌ 悪い例（不要なメソッド）:**
```typescript
export class HealthFactor {
  // 使われない複雑なメソッド
  isAbove(threshold: HealthFactor): boolean
  isBetween(min: HealthFactor, max: HealthFactor): boolean
  getUrgencyLevel(): UrgencyLevel
  getRiskCategory(): RiskCategory
  format(precision: number): string
  toPercentage(): number
}
```

**✅ 良い例（最終設計）:**
```typescript
export class HealthFactor {
  static readonly LIQUIDATION_THRESHOLD = new HealthFactor(1.0)
  
  constructor(private readonly value: number)
  static from(value: bigint): HealthFactor
  static fromNumber(value: number): HealthFactor
  toNumber(): number
  isLiquidatable(): boolean  // 最も重要な1つのビジネスロジックのみ
}
```

**学び：**
- 1つのValue Objectには1つの主要な責任のみ
- 比較メソッドは本当に必要な1つだけ
- フォーマット機能は表示層で対応

## 設計原則

### 1. YAGNI原則（You Aren't Gonna Need It）
**「今必要ない機能は実装しない」**
- 将来必要になるかもしれない機能は無視
- 実際に要求されるまで待つ
- 推測ではなく実際のニーズに基づいて実装

### 2. KISS原則（Keep It Simple, Stupid）
**「シンプルに保つ」**
- 複雑な抽象化より直接的な実装を選ぶ
- 理解しやすさを優先
- 賢すぎるコードは避ける

### 3. 単一責任原則
**「1つのクラス・メソッドは1つの責任のみ」**
- Interfaceは1つの明確な目的のみ
- メソッドは1つの動作のみ
- クラスは1つのドメイン概念のみ

### 4. 最小インターフェース原則
**「必要最小限のメソッドのみ公開」**
- Interfaceは3個以下のメソッド
- publicメソッドは本当に外部から呼ばれるもののみ
- getterは必要な分だけ

## 実装時のチェックリスト

### Interface設計時
- [ ] このinterfaceは3個以下のメソッドか？
- [ ] 各メソッドは今すぐ使われるか？
- [ ] 戻り値は必要最小限の情報か？

### Class設計時
- [ ] このメソッドは今すぐ使われるか？
- [ ] このクラスは1つの責任のみか？
- [ ] getter以外のメソッドは本当に必要か？

### 設定・オプション設計時
- [ ] この設定オプションは今すぐ必要か？
- [ ] デフォルト値で十分ではないか？
- [ ] 環境変数で対応できないか？

### エラーハンドリング設計時
- [ ] このエラー情報は本当に必要か？
- [ ] シンプルなthrow Error()で十分ではないか？
- [ ] 複雑なエラー分類は過剰ではないか？

## 良い設計の指標

### ✅ 良い設計の特徴
- ファイルサイズが小さい（50行以下）
- メソッド数が少ない（5個以下）
- 依存関係が明確
- 1回読めば理解できる
- テストが簡単に書ける

### ❌ 悪い設計の兆候
- 使われないメソッドがある
- オプションパラメータが多い
- 複雑な戻り値オブジェクト
- 階層が深すぎる（4層以上）
- ドキュメントなしでは理解できない

## まとめ

**「今必要なものだけを、可能な限りシンプルに実装する」**

これが最も重要な原則です。将来の拡張性や柔軟性を考えすぎると、現在の要求すら満たせない複雑なコードになってしまいます。

シンプルなコードは：
- 理解しやすい
- 変更しやすい
- テストしやすい
- バグが少ない

複雑な機能が本当に必要になった時に、シンプルなベースから拡張することは、最初から複雑に作るよりもはるかに容易です。

**常に「これは本当に今必要か？」を自問し、答えがNoなら実装しない勇気を持ちましょう。**
