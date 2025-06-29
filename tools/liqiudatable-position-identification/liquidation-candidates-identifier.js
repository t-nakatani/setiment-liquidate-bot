const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// 設定値
const RPC_URL = 'https://rpc.hyperliquid.xyz/evm';
const RISK_MODULE_ADDRESS = '0xf606Feb0E3134B29fa550Cc3f1F74F4114545389';
const LIQUIDATION_THRESHOLD = 1.0; // Health Factor 1.0未満を精算対象とする

// RiskModuleのABI
const RISK_MODULE_ABI = [
    "function getPositionHealthFactor(address position) external view returns (uint256)"
];

class LiquidationCandidatesIdentifier {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(RPC_URL);
        this.riskModule = new ethers.Contract(RISK_MODULE_ADDRESS, RISK_MODULE_ABI, this.provider);
        this.results = [];
    }

    /**
     * CSVファイルからポジションアドレスを読み込み
     */
    async loadPositionsFromCsv(csvFilePath) {
        return new Promise((resolve, reject) => {
            const positions = [];
            
            if (!fs.existsSync(csvFilePath)) {
                reject(new Error(`CSVファイルが見つかりません: ${csvFilePath}`));
                return;
            }

            fs.createReadStream(csvFilePath)
                .pipe(csv())
                .on('data', (row) => {
                    if (row.position && ethers.isAddress(row.position)) {
                        positions.push({
                            position: row.position,
                            caller: row.caller || '',
                            owner: row.owner || ''
                        });
                    }
                })
                .on('end', () => {
                    console.log(`${positions.length}個のポジションをCSVから読み込みました`);
                    resolve(positions);
                })
                .on('error', reject);
        });
    }

    /**
     * 単一のポジションのHealth Factorを照会
     */
    async queryHealthFactor(positionAddress) {
        try {
            const healthFactor = await this.riskModule.getPositionHealthFactor(positionAddress);
            
            // 特別な値の処理
            if (healthFactor.toString() === ethers.MaxUint256.toString()) {
                return {
                    position: positionAddress,
                    healthFactor: 'MAX',
                    healthFactorRaw: healthFactor.toString(),
                    isLiquidatable: false,
                    status: 'HEALTHY (No debt)',
                    error: null
                };
            } else if (healthFactor === 0n) {
                return {
                    position: positionAddress,
                    healthFactor: '0',
                    healthFactorRaw: '0',
                    isLiquidatable: true,
                    status: 'BAD DEBT',
                    error: null
                };
            } else {
                const healthFactorFormatted = parseFloat(ethers.formatUnits(healthFactor, 18));
                const isLiquidatable = healthFactorFormatted < LIQUIDATION_THRESHOLD;
                
                return {
                    position: positionAddress,
                    healthFactor: healthFactorFormatted.toFixed(6),
                    healthFactorRaw: healthFactor.toString(),
                    isLiquidatable,
                    status: isLiquidatable ? 'LIQUIDATABLE' : 'HEALTHY',
                    error: null
                };
            }
        } catch (error) {
            return {
                position: positionAddress,
                healthFactor: null,
                healthFactorRaw: null,
                isLiquidatable: false,
                status: 'ERROR',
                error: error.message
            };
        }
    }

    /**
     * 複数のポジションを並行処理でHealth Factor照会
     */
    async processPositionsBatch(positions, batchSize = 10) {
        const results = [];
        
        for (let i = 0; i < positions.length; i += batchSize) {
            const batch = positions.slice(i, i + batchSize);
            console.log(`処理中: ${i + 1}-${Math.min(i + batchSize, positions.length)}/${positions.length}`);
            
            const batchPromises = batch.map(async (pos) => {
                const result = await this.queryHealthFactor(pos.position);
                return {
                    ...result,
                    caller: pos.caller,
                    owner: pos.owner
                };
            });
            
            const batchResults = await Promise.allSettled(batchPromises);
            
            batchResults.forEach((settledResult, index) => {
                if (settledResult.status === 'fulfilled') {
                    results.push(settledResult.value);
                } else {
                    console.error(`エラー (${batch[index].position}):`, settledResult.reason);
                    results.push({
                        position: batch[index].position,
                        caller: batch[index].caller,
                        owner: batch[index].owner,
                        healthFactor: null,
                        healthFactorRaw: null,
                        isLiquidatable: false,
                        status: 'ERROR',
                        error: settledResult.reason.message
                    });
                }
            });
            
            // レート制限回避のための待機
            if (i + batchSize < positions.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return results;
    }

    /**
     * 結果をCSVファイルに保存
     */
    async saveResultsToCsv(results, outputPath) {
        const csvHeader = 'position,caller,owner,healthFactor,healthFactorRaw,isLiquidatable,status,error\n';
        const csvContent = results.map(r => 
            `${r.position},${r.caller},${r.owner},${r.healthFactor || ''},${r.healthFactorRaw || ''},${r.isLiquidatable},${r.status},"${r.error || ''}"`
        ).join('\n');
        
        const fullContent = csvHeader + csvContent;
        
        await fs.promises.writeFile(outputPath, fullContent);
        console.log(`結果を保存しました: ${outputPath}`);
    }

    /**
     * 精算対象のポジションのみをフィルタリングして保存
     */
    async saveLiquidatableToCsv(results, outputPath) {
        const liquidatableResults = results.filter(r => r.isLiquidatable);
        
        if (liquidatableResults.length === 0) {
            console.log('精算対象のポジションは見つかりませんでした');
            return;
        }
        
        await this.saveResultsToCsv(liquidatableResults, outputPath);
        console.log(`精算対象: ${liquidatableResults.length}個のポジション`);
    }

    /**
     * 統計情報を表示
     */
    displayStats(results) {
        const total = results.length;
        const liquidatable = results.filter(r => r.isLiquidatable).length;
        const healthy = results.filter(r => r.status === 'HEALTHY' || r.status === 'HEALTHY (No debt)').length;
        const errors = results.filter(r => r.status === 'ERROR').length;
        
        console.log('\n=== 統計情報 ===');
        console.log(`総ポジション数: ${total}`);
        console.log(`精算対象 (Health Factor < ${LIQUIDATION_THRESHOLD}): ${liquidatable}`);
        console.log(`健全なポジション: ${healthy}`);
        console.log(`エラー: ${errors}`);
        console.log(`精算対象率: ${((liquidatable / total) * 100).toFixed(2)}%`);
    }
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.error('使用方法:');
        console.error('  単一CSVファイル: node liquidation-candidates-identifier.js <csv_file_path>');
        console.error('  複数CSVファイル: node liquidation-candidates-identifier.js <csv_directory>');
        console.error('\n例:');
        console.error('  node liquidation-candidates-identifier.js ../event_collector/output/events-6500000-6600000.csv');
        console.error('  node liquidation-candidates-identifier.js ../event_collector/output/');
        process.exit(1);
    }

    const inputPath = args[0];
    const identifier = new LiquidationCandidatesIdentifier();

    try {
        let csvFiles = [];
        
        // パスの種別を判定
        if (fs.statSync(inputPath).isDirectory()) {
            // ディレクトリの場合、全CSVファイルを処理
            const files = fs.readdirSync(inputPath);
            csvFiles = files
                .filter(file => file.endsWith('.csv'))
                .map(file => path.join(inputPath, file));
            
            if (csvFiles.length === 0) {
                console.error(`CSVファイルが見つかりません: ${inputPath}`);
                process.exit(1);
            }
            
            console.log(`${csvFiles.length}個のCSVファイルを処理します`);
        } else {
            // 単一ファイルの場合
            csvFiles = [inputPath];
        }

        let allResults = [];
        
        // 各CSVファイルを処理
        for (const csvFile of csvFiles) {
            console.log(`\n処理中: ${csvFile}`);
            
            const positions = await identifier.loadPositionsFromCsv(csvFile);
            if (positions.length === 0) {
                console.log(`スキップ: ポジションが見つかりません`);
                continue;
            }
            
            const results = await identifier.processPositionsBatch(positions);
            allResults = allResults.concat(results);
        }

        if (allResults.length === 0) {
            console.log('処理対象のポジションがありませんでした');
            return;
        }

        // 結果を保存
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputDir = './output';
        
        // 出力ディレクトリを作成
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const allResultsPath = path.join(outputDir, `liquidation-analysis-${timestamp}.csv`);
        const liquidatablePath = path.join(outputDir, `liquidation-candidates-${timestamp}.csv`);
        
        await identifier.saveResultsToCsv(allResults, allResultsPath);
        await identifier.saveLiquidatableToCsv(allResults, liquidatablePath);
        
        // 統計情報を表示
        identifier.displayStats(allResults);
        
    } catch (error) {
        console.error('処理中にエラーが発生しました:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { LiquidationCandidatesIdentifier };