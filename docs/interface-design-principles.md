# Interface設計原則ガイド

## 概要

このドキュメントは、効果的なInterface設計のための原則とガイドラインをまとめたものです。「実現方法」ではなく「実現したいこと」を基準とした設計により、保守性と拡張性の高いシステムを構築できます。

## 根本原則

### 1. 「What（何を）」で定義し、「How（どうやって）」で定義しない

**❌ 悪い例（実現方法ベース）**
```typescript
interface IFileDataService {
  readFromFile(path: string): Promise<Data>
  parseJsonFile(path: string): Promise<Object>
}

interface IBlockchainDataService {
  callSmartContract(address: string): Promise<Result>
  queryBlockchainNode(query: string): Promise<Data>
}
```

**✅ 良い例（実現したいことベース）**
```typescript
interface IDataProvider {
  provideData(criteria: SearchCriteria): Promise<Data>
  validateData(data: Data): Promise<boolean>
}

interface IPositionInfoProvider {
  providePositionInfo(borrower: Address, market: MarketId): Promise<Position>
  providePositionList(filter: PositionFilter): Promise<Position[]>
}
```

### 2. ビジネス価値を中心とした責任設計

Interface設計時に自問すべき質問：
- この機能がシステムに提供する**ビジネス価値**は何か？
- **誰が**この機能を必要としているか？
- **なぜ**この機能が必要なのか？

技術的実装詳細は Implementation で解決する問題であり、Interface の責任ではありません。

## 設計パターンとアンチパターン

### アンチパターン: 技術実装露出型

```typescript
// ❌ データソースの技術実装が露出している
interface IDatabaseService {
  executeSQL(query: string): Promise<Row[]>
  openConnection(): Promise<Connection>
}

interface IHttpService {
  sendGetRequest(url: string): Promise<Response>
  handleHttpError(error: HttpError): void
}
```

**問題点:**
- データソース変更時にInterface変更が必要
- 利用者が技術実装を意識する必要がある
- テストが困難（具体的な技術に依存）

### 良いパターン: ビジネス価値中心型

```typescript
// ✅ ビジネス価値が明確で実装に非依存
interface IUserRepository {
  findUser(id: UserId): Promise<User | null>
  saveUser(user: User): Promise<void>
  searchUsers(criteria: UserSearchCriteria): Promise<User[]>
}

interface INotificationService {
  sendNotification(recipient: User, message: Message): Promise<void>
  scheduleNotification(notification: Notification, when: Date): Promise<void>
}
```

**利点:**
- 実装技術の変更に影響されない
- ビジネスロジックが理解しやすい
- モック作成とテストが容易

## 実践的な設計ガイドライン

### 1. Interface命名規則

**推奨パターン:**
- `I{BusinessConcept}Provider` - 情報提供の責任
- `I{BusinessConcept}Repository` - データ永続化の責任  
- `I{BusinessConcept}Service` - ビジネスロジック処理の責任
- `I{BusinessConcept}Manager` - 複合的な管理責任

**避けるべきパターン:**
- `I{Technology}Service` (例: `IHttpService`, `IDatabaseService`)
- `I{Implementation}Handler` (例: `IFileHandler`, `IApiHandler`)

### 2. メソッド設計の指針

```typescript
// ✅ ビジネス意図が明確
interface IOrderService {
  createOrder(customer: Customer, items: OrderItem[]): Promise<Order>
  cancelOrder(orderId: OrderId, reason: CancellationReason): Promise<void>
  calculateTotal(order: Order): Promise<Money>
}

// ❌ 技術実装に依存
interface IOrderService {
  insertOrderToDatabase(orderData: any): Promise<number>
  sendOrderConfirmationEmail(emailData: any): Promise<void>
  callPaymentAPI(paymentRequest: any): Promise<any>
}
```

### 3. 依存関係の設計

```typescript
// ✅ 適切な抽象化レベル
class OrderProcessingService {
  constructor(
    private orderRepository: IOrderRepository,
    private paymentProvider: IPaymentProvider,
    private notificationService: INotificationService
  ) {}
}

// ❌ 技術実装への直接依存
class OrderProcessingService {
  constructor(
    private mysqlDatabase: MySQLDatabase,
    private stripeAPI: StripeAPI,
    private sendgridEmail: SendGridEmail
  ) {}
}
```

## 判断基準とチェックポイント

### Interface設計時の自己チェック

1. **技術非依存性**
   - [ ] 特定のライブラリ・フレームワークに依存していないか？
   - [ ] データソースが変わってもInterfaceは変更不要か？

2. **ビジネス価値の明確性**
   - [ ] Interface名からビジネス責任が理解できるか？
   - [ ] メソッド名がビジネス操作を表現しているか？

3. **テスタビリティ**
   - [ ] モック実装が簡単に作れるか？
   - [ ] 単体テストで他のコンポーネントに依存しないか？

4. **拡張性**
   - [ ] 新しい実装方法を追加しやすいか？
   - [ ] 既存コードを変更せずに新機能を追加できるか？

### リファクタリングの指標

以下に該当する場合、Interface設計の見直しを検討：

- 実装技術の変更でInterfaceも変更が必要
- テスト時に具体的な技術スタックが必要
- Interface名に技術名が含まれている
- メソッド引数が技術固有の型を要求している
- 利用者が実装詳細を知る必要がある

## 実例による学習

### position-synchronizer での改善例

**改善前（実現方法ベース）:**
```typescript
interface IBlockchainDataService {
  getPosition(marketId: MarketId, borrower: BorrowerAddress): Promise<PositionData>
  getMultiplePositions(requests: PositionRequest[]): Promise<Map<string, PositionData>>
  testConnection(): Promise<ConnectionTestResult>
}

interface IFileDataService {
  readPositionPairs(filePath: string): Promise<BorrowerMarketPairCollection>
  validateAndParseFile(filePath: string): Promise<JsonValidationResult>
  listJsonFiles(directory: string): string[]
}
```

**改善後（実現したいことベース）:**
```typescript
interface IPositionDataProvider {
  providePosition(borrower: BorrowerAddress, marketId: MarketId): Promise<Position | null>
  providePositions(criteria: PositionCriteria): Promise<Position[]>
  validateDataSource(): Promise<ValidationResult>
}

interface IPositionPairProvider {
  providePositionPairs(source: DataSource): Promise<BorrowerMarketPairCollection>
  validatePositionPairs(pairs: BorrowerMarketPair[]): Promise<ValidationResult>
  listAvailableSources(): Promise<DataSource[]>
}
```

**改善効果:**
- データソース変更（API → GraphQL → キャッシュ）に対応可能
- ビジネス責任が明確
- テストとモック作成が容易

## まとめ

効果的なInterface設計の鍵は、**技術的実装詳細を隠蔽し、ビジネス価値を明確に表現すること**です。

- **What（何を提供するか）** を中心に設計
- **How（どうやって実現するか）** は実装クラスの責任
- **Why（なぜ必要か）** を明確にしてInterface分割

この原則に従うことで、保守性・テスタビリティ・拡張性の高いシステムを構築できます。