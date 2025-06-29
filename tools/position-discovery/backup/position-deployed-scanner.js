const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const utils = require("./utils");

class PositionDeployedScanner {
  constructor(configPath = "./config.json") {
    this.config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    this.provider = null;
    this.contract = null;
    this.eventFilter = null;
    this.results = [];

    // RPC リクエスト間隔設定 (ミリ秒)
    this.rpcRequestInterval = this.config.scanning.rpcRequestInterval || 100; // デフォルト 0.1秒
  }

  /**
   * 初期化
   */
  async initialize() {
    try {
      utils.log("Position Deployed Scanner を初期化中...");

      // Provider設定
      this.provider = new ethers.JsonRpcProvider(this.config.network.rpcUrl);

      // 接続確認
      const network = await this.provider.getNetwork();
      utils.log(`ネットワークに接続: ${network.name} (ChainID: ${network.chainId})`);

      // 初期化時の待機
      await utils.sleep(this.rpcRequestInterval);

      if (Number(network.chainId) !== this.config.network.chainId) {
        throw new Error(`Chain ID不一致: 期待値=${this.config.network.chainId}, 実際値=${network.chainId}`);
      }

      // PositionManagerのABI（PositionDeployedイベントのみ）
      const positionManagerAbi = [
        "event PositionDeployed(address indexed position, address indexed caller, address indexed owner)",
      ];

      // コントラクト設定
      if (!utils.isValidAddress(this.config.contracts.positionManager.address)) {
        throw new Error("PositionManagerアドレスが設定されていません。config.jsonを確認してください。");
      }

      this.contract = new ethers.Contract(
        this.config.contracts.positionManager.address,
        positionManagerAbi,
        this.provider
      );

      // イベントフィルター設定
      this.eventFilter = this.contract.filters.PositionDeployed();

      utils.log("初期化完了");
    } catch (error) {
      utils.log(`初期化エラー: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * 指定した範囲でPositionDeployedイベントをスキャン
   * @param {number} fromBlock - 開始ブロック
   * @param {number} toBlock - 終了ブロック
   * @param {Object} options - オプション
   */
  async scanEvents(fromBlock, toBlock = "latest", options = {}) {
    try {
      const { batchSize = options.batchSize || this.config.scanning.batchSize } = options;

      // 最新ブロック取得
      if (toBlock === "latest") {
        toBlock = await this.provider.getBlockNumber();
      }

      utils.log(`イベントスキャン開始: ブロック ${fromBlock} から ${toBlock}`);
      utils.log(`バッチサイズ: ${batchSize} ブロック`);

      this.results = [];

      // バッチ処理でスキャン
      let lastSuccessfulBlock = fromBlock;
      let hasErrors = false;

      for (let currentBlock = fromBlock; currentBlock <= toBlock; currentBlock += batchSize) {
        const endBlock = Math.min(currentBlock + batchSize - 1, toBlock);

        try {
          await this._scanBatch(currentBlock, endBlock);
          lastSuccessfulBlock = endBlock;
        } catch (error) {
          hasErrors = true;
          utils.log(`バッチ ${currentBlock}-${endBlock} でエラー発生: ${error.message}`, "error");
          utils.log(`スキャンを中断。${fromBlock}-${lastSuccessfulBlock} までの結果を保持`, "warn");
          break;
        }

        // 進捗表示
        const progress = Math.min(endBlock - fromBlock + 1, toBlock - fromBlock + 1);
        const total = toBlock - fromBlock + 1;
        utils.showProgress(progress, total, "スキャン進捗");

        // レート制限対策
        await utils.sleep(this.rpcRequestInterval);
      }

      if (hasErrors) {
        utils.log(`\n部分的スキャン完了。発見されたイベント数: ${this.results.length}`, "warn");
        utils.log(`成功した範囲: ${fromBlock} - ${lastSuccessfulBlock}`, "warn");
      } else {
        utils.log(`\nスキャン完了。発見されたイベント数: ${this.results.length}`);
      }

      return this.results;
    } catch (error) {
      utils.log(`スキャンエラー: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * バッチでイベントをスキャン
   * @param {number} fromBlock - 開始ブロック
   * @param {number} toBlock - 終了ブロック
   */
  async _scanBatch(fromBlock, toBlock) {
    try {
      const logs = await utils.retry(
        async () => {
          return await this.contract.queryFilter(this.eventFilter, fromBlock, toBlock);
        },
        this.config.scanning.maxRetries,
        this.config.scanning.retryDelay
      );

      // ログを処理
      for (const log of logs) {
        const timestamp = await utils.getBlockTimestamp(this.provider, log.blockNumber);
        const formattedLog = utils.formatEventLog(log, timestamp);
        this.results.push(formattedLog);

        // ブロック情報取得後の待機
        if (logs.length > 1) {
          await utils.sleep(this.rpcRequestInterval);
        }
      }
    } catch (error) {
      utils.log(`バッチスキャンエラー (${fromBlock}-${toBlock}): ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * 特定の期間でスキャン
   * @param {string} startDate - 開始日 (YYYY-MM-DD)
   * @param {string} endDate - 終了日 (YYYY-MM-DD)
   * @param {Object} options - オプション
   */
  async scanByDateRange(startDate, endDate = null, options = {}) {
    try {
      const startBlock = await utils.dateToBlockNumber(this.provider, startDate);
      const endBlock = endDate ? await utils.dateToBlockNumber(this.provider, endDate) : "latest";

      utils.log(`日付範囲: ${startDate} から ${endDate || "現在"}`);
      utils.log(`ブロック範囲: ${startBlock} から ${endBlock}`);

      return await this.scanEvents(startBlock, endBlock, options);
    } catch (error) {
      utils.log(`日付範囲スキャンエラー: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * 特定のownerのPositionを検索
   * @param {string} ownerAddress - オーナーアドレス
   * @param {number} fromBlock - 開始ブロック
   * @param {number} toBlock - 終了ブロック
   */
  async scanByOwner(ownerAddress, fromBlock = 0, toBlock = "latest") {
    try {
      if (!utils.isValidAddress(ownerAddress)) {
        throw new Error("無効なオーナーアドレス");
      }

      utils.log(`オーナーアドレス ${ownerAddress} のPositionを検索中...`);

      // フィルターを作成
      const filter = this.contract.filters.PositionDeployed(null, null, ownerAddress);

      if (toBlock === "latest") {
        toBlock = await this.provider.getBlockNumber();
      }

      const logs = await utils.retry(
        async () => {
          return await this.contract.queryFilter(filter, fromBlock, toBlock);
        },
        this.config.scanning.maxRetries,
        this.config.scanning.retryDelay
      );

      this.results = [];
      for (const log of logs) {
        const timestamp = await utils.getBlockTimestamp(this.provider, log.blockNumber);
        const formattedLog = utils.formatEventLog(log, timestamp);
        this.results.push(formattedLog);

        // ブロック情報取得後の待機
        if (logs.length > 1) {
          await utils.sleep(this.rpcRequestInterval);
        }
      }

      utils.log(`発見されたPosition数: ${this.results.length}`);
      return this.results;
    } catch (error) {
      utils.log(`オーナー検索エラー: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * 結果を保存
   * @param {string} outputDir - 出力ディレクトリ
   * @param {Array} formats - 出力フォーマット (['json', 'csv'])
   */
  async saveResults(outputDir = "./output", formats = ["json"]) {
    try {
      if (!this.results.length) {
        utils.log("保存する結果がありません", "warn");
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      for (const format of formats) {
        const filename = `position-deployed-${timestamp}.${format}`;

        if (format === "json") {
          utils.saveToJson(this.results, filename, outputDir);
        } else if (format === "csv") {
          utils.saveToCsv(this.results, filename, outputDir);
        }
      }
    } catch (error) {
      utils.log(`結果保存エラー: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * 統計情報を表示
   */
  showStatistics() {
    if (!this.results.length) {
      utils.log("統計情報: 結果がありません");
      return;
    }

    const uniqueOwners = new Set(this.results.map((r) => r.owner)).size;
    const uniqueCallers = new Set(this.results.map((r) => r.caller)).size;
    const firstDeployment = this.results.reduce((min, r) => (r.timestamp < min.timestamp ? r : min));
    const lastDeployment = this.results.reduce((max, r) => (r.timestamp > max.timestamp ? r : max));

    console.log("\n=== 統計情報 ===");
    console.log(`総Position数: ${this.results.length}`);
    console.log(`ユニークなオーナー数: ${uniqueOwners}`);
    console.log(`ユニークな呼び出し元数: ${uniqueCallers}`);
    console.log(`最初のデプロイ: ${firstDeployment.date} (Block: ${firstDeployment.blockNumber})`);
    console.log(`最後のデプロイ: ${lastDeployment.date} (Block: ${lastDeployment.blockNumber})`);
    console.log("================\n");
  }

  /**
   * 結果をフィルタリング
   * @param {Function} filterFn - フィルタ関数
   */
  filterResults(filterFn) {
    this.results = this.results.filter(filterFn);
    return this.results;
  }
}

module.exports = PositionDeployedScanner;
