#!/usr/bin/env node

const PositionDeployedScanner = require('./position-deployed-scanner');
const utils = require('./utils');

// コマンドライン引数を解析
function parseArguments() {
    const args = process.argv.slice(2);
    const options = {
        blocks: 5000,
        owner: null,
        outputFormats: ['json'],
        outputDir: './output',
        batchSize: 1000
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
            case '--blocks':
            case '-n':
                options.blocks = parseInt(nextArg);
                i++;
                break;
            case '--owner':
            case '-o':
                options.owner = nextArg;
                i++;
                break;
            case '--format':
                options.outputFormats = nextArg.split(',');
                i++;
                break;
            case '--output':
                options.outputDir = nextArg;
                i++;
                break;
            case '--batch-size':
            case '-b':
                options.batchSize = parseInt(nextArg);
                i++;
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
                break;
        }
    }

    return options;
}

// ヘルプメッセージを表示
function showHelp() {
    console.log(`
Position Deployed Scanner - PositionManagerで作成されたPositionを検索

使用方法:
  node scan-positions.js [オプション]

オプション:
  -n, --blocks <number>         直近何ブロックをスキャンするか (デフォルト: 5000)
  -o, --owner <address>         特定のオーナーアドレスで検索
  --format <formats>            出力フォーマット (json,csv) デフォルト: json
  --output <dir>                出力ディレクトリ (デフォルト: ./output)
  -b, --batch-size <number>     バッチサイズ (デフォルト: 1000)
  -h, --help                    このヘルプを表示

例:
  # 直近5000ブロックをスキャン (デフォルト)
  node scan-positions.js

  # 直近1000ブロックをスキャン
  node scan-positions.js --blocks 1000

  # 直近10000ブロックをスキャン
  node scan-positions.js -n 10000

  # 特定のオーナーアドレスで検索 (直近5000ブロック)
  node scan-positions.js --owner 0x1234567890abcdef1234567890abcdef12345678

  # JSON とCSV 両方で出力
  node scan-positions.js --format json,csv

  # カスタム出力ディレクトリ
  node scan-positions.js --output ./my-results

  # 大きなバッチサイズで高速スキャン
  node scan-positions.js --blocks 100000 --batch-size 5000
    `);
}

// バリデーション
function validateOptions(options) {
    // 無効なブロック数
    if (options.blocks <= 0) {
        throw new Error('無効なブロック数: 1以上の値を指定してください');
    }

    if (options.blocks > 1000000) {
        throw new Error('ブロック数が大きすぎます: 1000000以下の値を指定してください');
    }

    // 無効なバッチサイズ
    if (options.batchSize <= 0) {
        throw new Error('無効なバッチサイズ: 1以上の値を指定してください');
    }

    // 無効なアドレス
    if (options.owner && !utils.isValidAddress(options.owner)) {
        throw new Error('無効なオーナーアドレス');
    }

    // 無効な出力フォーマット
    const validFormats = ['json', 'csv'];
    for (const format of options.outputFormats) {
        if (!validFormats.includes(format)) {
            throw new Error(`無効な出力フォーマット: ${format}`);
        }
    }
}

// メイン実行関数
async function main() {
    try {
        utils.log('Position Deployed Scanner を開始...');
        
        const options = parseArguments();
        validateOptions(options);

        // スキャナーを初期化
        const scanner = new PositionDeployedScanner();
        await scanner.initialize();

        // 現在のブロック高度を取得
        const latestBlock = await scanner.provider.getBlockNumber();
        const fromBlock = Math.max(0, latestBlock - options.blocks + 1);
        const toBlock = latestBlock;
        
        // ブロック情報取得後の待機
        await new Promise(resolve => setTimeout(resolve, 100));

        utils.log(`現在のブロック: ${latestBlock}`);
        utils.log(`スキャン範囲: ${fromBlock} - ${toBlock} (${options.blocks}ブロック)`);

        // スキャン実行
        let results;
        
        if (options.owner) {
            // オーナーアドレスで検索
            results = await scanner.scanByOwner(
                options.owner,
                fromBlock,
                toBlock
            );
        } else {
            // ブロック範囲でスキャン
            results = await scanner.scanEvents(
                fromBlock,
                toBlock,
                { batchSize: options.batchSize }
            );
        }

        // 統計情報を表示
        scanner.showStatistics();

        // 結果を保存（部分的結果でも保存）
        if (results.length > 0) {
            await scanner.saveResults(options.outputDir, options.outputFormats);
            utils.log(`結果が ${options.outputDir} に保存されました`);
            utils.log('スキャン完了');
        } else {
            utils.log('該当するイベントが見つかりませんでした', 'warn');
            utils.log('スキャン完了');
        }
        
    } catch (error) {
        utils.log(`エラー: ${error.message}`, 'error');
        
        // エラーが発生してもスキャナーが初期化されていて結果がある場合は保存
        try {
            if (typeof scanner !== 'undefined' && scanner.results && scanner.results.length > 0) {
                utils.log(`エラー発生時点までの部分的結果を保存します（${scanner.results.length}件）`, 'warn');
                scanner.showStatistics();
                await scanner.saveResults(options.outputDir, options.outputFormats);
                utils.log(`部分的結果が ${options.outputDir} に保存されました`, 'warn');
            }
        } catch (saveError) {
            utils.log(`結果保存エラー: ${saveError.message}`, 'error');
        }
        
        console.error(error.stack);
        process.exit(1);
    }
}

// プロセス終了時の処理
process.on('SIGINT', () => {
    utils.log('\nスキャンが中断されました', 'warn');
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    utils.log(`未処理のPromiseエラー: ${reason}`, 'error');
    console.error('Promise:', promise);
    process.exit(1);
});

// 実行
if (require.main === module) {
    main();
}

module.exports = { main, parseArguments, validateOptions };