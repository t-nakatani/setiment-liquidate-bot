class Logger {
  constructor(enableProgress = true) {
    this.enableProgress = enableProgress;
  }

  info(message) {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`);
  }

  error(message) {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`);
  }

  warn(message) {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`);
  }

  success(message) {
    console.log(`[SUCCESS] ${new Date().toISOString()}: ${message}`);
  }

  progress(data) {
    if (!this.enableProgress) return;

    switch (data.type) {
      case 'batch_start':
        this._logBatchStart(data);
        break;
      case 'batch_complete':
        this._logBatchComplete(data);
        break;
      case 'batch_error':
        this._logBatchError(data);
        break;
      default:
        this.info(`進捗: ${JSON.stringify(data)}`);
    }
  }

  _logBatchStart(data) {
    const progress = ((data.processedBlocks / data.totalBlocks) * 100).toFixed(1);
    this.info(`バッチ処理開始: ブロック ${data.fromBlock}-${data.toBlock} (進捗: ${progress}%)`);
  }

  _logBatchComplete(data) {
    this.info(`バッチ完了: ${data.eventsFound}個のイベントを発見 (累計: ${data.totalEvents}個)`);
  }

  _logBatchError(data) {
    this.error(`バッチエラー: ブロック ${data.fromBlock}-${data.toBlock} - ${data.error}`);
  }

  logScanSummary(events, duration) {
    this.success(`スキャン完了: ${events.length}個のイベントを${duration}ms で取得`);
    
    if (events.length > 0) {
      const blockNumbers = events.map(e => e.blockNumber);
      const minBlock = Math.min(...blockNumbers);
      const maxBlock = Math.max(...blockNumbers);
      this.info(`ブロック範囲: ${minBlock} - ${maxBlock}`);
    }
  }

  logExportResult(result) {
    this.success(`${result.format.toUpperCase()}エクスポート完了: ${result.filePath} (${result.eventCount}個のイベント)`);
  }
}

module.exports = Logger;