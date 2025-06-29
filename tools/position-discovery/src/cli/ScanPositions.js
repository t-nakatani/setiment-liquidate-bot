#!/usr/bin/env node

const NetworkClient = require('../core/NetworkClient');
const EventFilter = require('../core/EventFilter');
const EventScanner = require('../core/EventScanner');
const JsonExporter = require('../exporters/JsonExporter');
const ConfigLoader = require('../utils/ConfigLoader');
const Logger = require('../utils/Logger');

class ScanPositionsCLI {
  constructor() {
    this.logger = new Logger();
  }

  async run() {
    try {
      const args = this._parseArgs();
      const config = ConfigLoader.load(args.configPath);
      
      this.logger.info('Position Deployed スキャナーを初期化中...');
      
      const networkOptions = ConfigLoader.getNetworkOptions(config);
      const networkClient = new NetworkClient(config.network.rpcUrl, networkOptions);
      
      const network = await networkClient.initialize();
      this.logger.info(`ネットワークに接続: ${network.name} (Chain ID: ${network.chainId})`);
      
      if (network.chainId !== config.network.chainId) {
        throw new Error(`Chain ID不一致: 期待値=${config.network.chainId}, 実際値=${network.chainId}`);
      }
      
      const eventFilter = new EventFilter(config.contracts.positionManager.address);
      const eventScanner = new EventScanner(networkClient, eventFilter);
      
      const startTime = Date.now();
      const events = await this._scanEvents(eventScanner, args);
      const duration = Date.now() - startTime;
      
      this.logger.logScanSummary(events, duration);
      
      await this._exportResults(events);
      
    } catch (error) {
      this.logger.error(`エラー: ${error.message}`);
      process.exit(1);
    }
  }

  async _scanEvents(eventScanner, args) {
    const onProgress = (data) => this.logger.progress(data);
    
    if (args.latest) {
      this.logger.info(`最新 ${args.latest} ブロックをスキャン中...`);
      return await eventScanner.scanFromLatestBlocks(args.latest, { onProgress });
    }
    
    this.logger.info(`ブロック ${args.startBlock} から ${args.endBlock} をスキャン中...`);
    return await eventScanner.scanByBlockRange(args.startBlock, args.endBlock, { onProgress });
  }

  async _exportResults(events) {
    const exporter = new JsonExporter('./output');
    const filename = exporter.generateFilename();
    const result = await exporter.export(events, filename);
    this.logger.logExportResult(result);
  }

  _parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {
      configPath: './config.json',
      startBlock: 0,
      endBlock: null,
      latest: null
    };

    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '--config':
          parsed.configPath = args[++i];
          break;
        case '--start-block':
          parsed.startBlock = parseInt(args[++i]);
          break;
        case '--end-block':
          parsed.endBlock = parseInt(args[++i]);
          break;
        case '--latest':
          parsed.latest = parseInt(args[++i]);
          break;
        case '--help':
          this._showHelp();
          process.exit(0);
          break;
      }
    }

    if (!parsed.endBlock && !parsed.latest) {
      throw new Error('--end-block または --latest を指定してください');
    }

    return parsed;
  }

  _showHelp() {
    console.log(`
Position Deployed Scanner - イベント取得ツール

使用方法:
  node scan-positions.js [オプション]

オプション:
  --config <path>         設定ファイルのパス (デフォルト: ./config.json)
  --start-block <number>  開始ブロック番号 (デフォルト: 0)
  --end-block <number>    終了ブロック番号
  --latest <number>       最新N個のブロックをスキャン
  --help                  このヘルプを表示

例:
  node scan-positions.js --start-block 1000 --end-block 2000
  node scan-positions.js --latest 1000
    `);
  }
}

if (require.main === module) {
  const cli = new ScanPositionsCLI();
  cli.run();
}

module.exports = ScanPositionsCLI;