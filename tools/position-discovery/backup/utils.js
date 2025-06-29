const fs = require('fs');
const path = require('path');

/**
 * ブロック番号からタイムスタンプを取得
 * @param {Object} provider - ethers provider
 * @param {number} blockNumber - ブロック番号
 * @returns {Promise<number>} タイムスタンプ
 */
async function getBlockTimestamp(provider, blockNumber) {
    try {
        const block = await provider.getBlock(blockNumber);
        return block.timestamp;
    } catch (error) {
        console.error(`ブロック ${blockNumber} のタイムスタンプ取得エラー:`, error.message);
        return null;
    }
}

/**
 * 日付文字列をブロック番号に変換（概算）
 * @param {Object} provider - ethers provider
 * @param {string} dateString - 日付文字列 (YYYY-MM-DD)
 * @param {number} averageBlockTime - 平均ブロック時間（秒）
 * @returns {Promise<number>} 概算ブロック番号
 */
async function dateToBlockNumber(provider, dateString, averageBlockTime = 12) {
    const targetTimestamp = Math.floor(new Date(dateString).getTime() / 1000);
    const latestBlock = await provider.getBlock('latest');
    const currentTimestamp = latestBlock.timestamp;
    const timeDiff = currentTimestamp - targetTimestamp;
    const blockDiff = Math.floor(timeDiff / averageBlockTime);
    
    return Math.max(0, latestBlock.number - blockDiff);
}

/**
 * 進捗バーを表示
 * @param {number} current - 現在の値
 * @param {number} total - 総数
 * @param {string} prefix - プレフィックス
 */
function showProgress(current, total, prefix = 'Progress') {
    const percentage = Math.floor((current / total) * 100);
    const barLength = 30;
    const filledLength = Math.floor((barLength * current) / total);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    
    process.stdout.write(`\r${prefix}: [${bar}] ${percentage}% (${current}/${total})`);
    
    if (current === total) {
        console.log(); // 改行
    }
}

/**
 * エラー処理付きでRetryロジックを実行
 * @param {Function} fn - 実行する関数
 * @param {number} maxRetries - 最大リトライ回数
 * @param {number} delay - リトライ間隔（ミリ秒）
 * @returns {Promise<any>} 関数の実行結果
 */
async function retry(fn, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < maxRetries) {
                console.log(`リトライ ${i + 1}/${maxRetries} (${delay}ms後)`);
                await sleep(delay);
                delay *= 2; // 指数バックオフ
            }
        }
    }
    
    throw lastError;
}

/**
 * 指定時間待機
 * @param {number} ms - 待機時間（ミリ秒）
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 結果をJSONファイルに保存
 * @param {Array} data - 保存するデータ
 * @param {string} filename - ファイル名
 * @param {string} outputDir - 出力ディレクトリ
 */
function saveToJson(data, filename, outputDir = './output') {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`結果をJSONファイルに保存: ${filepath}`);
}

/**
 * 結果をCSVファイルに保存
 * @param {Array} data - 保存するデータ
 * @param {string} filename - ファイル名
 * @param {string} outputDir - 出力ディレクトリ
 */
function saveToCsv(data, filename, outputDir = './output') {
    if (!data.length) return;
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');
    
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, csvContent);
    console.log(`結果をCSVファイルに保存: ${filepath}`);
}

/**
 * イベントログをフォーマット
 * @param {Object} log - イベントログ
 * @param {number} timestamp - ブロックタイムスタンプ
 * @returns {Object} フォーマット済みログ
 */
function formatEventLog(log, timestamp) {
    return {
        blockNumber: log.blockNumber,
        blockHash: log.blockHash,
        transactionHash: log.transactionHash,
        transactionIndex: log.transactionIndex,
        logIndex: log.logIndex,
        timestamp: timestamp,
        date: new Date(timestamp * 1000).toISOString(),
        position: log.args.position,
        caller: log.args.caller,
        owner: log.args.owner
    };
}

/**
 * アドレスが有効かチェック
 * @param {string} address - チェックするアドレス
 * @returns {boolean} 有効かどうか
 */
function isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * ログメッセージを時刻付きで出力
 * @param {string} message - ログメッセージ
 * @param {string} level - ログレベル (info, warn, error)
 */
function log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    switch (level) {
        case 'error':
            console.error(`${prefix} ${message}`);
            break;
        case 'warn':
            console.warn(`${prefix} ${message}`);
            break;
        default:
            console.log(`${prefix} ${message}`);
    }
}

module.exports = {
    getBlockTimestamp,
    dateToBlockNumber,
    showProgress,
    retry,
    sleep,
    saveToJson,
    saveToCsv,
    formatEventLog,
    isValidAddress,
    log
};