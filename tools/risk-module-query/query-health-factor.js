const { ethers } = require('ethers');

// Hyper EVM設定
const RPC_URL = 'https://rpc.hyperliquid.xyz/evm';
const CHAIN_ID = 999;

// コントラクトアドレス
const RISK_MODULE_ADDRESS = '0xf606Feb0E3134B29fa550Cc3f1F74F4114545389';

// RiskModuleのABI（getPositionHealthFactor関数のみ）
const RISK_MODULE_ABI = [
    "function getPositionHealthFactor(address position) external view returns (uint256)"
];

async function queryPositionHealthFactor(positionAddress) {
    try {
        // プロバイダー作成
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        
        // コントラクトインスタンス作成
        const riskModule = new ethers.Contract(RISK_MODULE_ADDRESS, RISK_MODULE_ABI, provider);
        
        console.log(`Position Address: ${positionAddress}`);
        console.log(`RiskModule Address: ${RISK_MODULE_ADDRESS}`);
        console.log('Querying health factor...\n');
        
        // ヘルスファクターを取得
        const healthFactor = await riskModule.getPositionHealthFactor(positionAddress);
        
        // 結果出力
        console.log('=== Health Factor Query Result ===');
        console.log(`Raw Value: ${healthFactor.toString()}`);
        
        // 特別な値の処理
        if (healthFactor.toString() === ethers.MaxUint256.toString()) {
            console.log('Health Factor: MAX (No debt or healthy position)');
        } else if (healthFactor === 0n) {
            console.log('Health Factor: 0 (Unhealthy/Bad debt position)');
        } else {
            // WAD (1e18) で割って小数点表示
            const healthFactorFormatted = ethers.formatUnits(healthFactor, 18);
            console.log(`Health Factor: ${healthFactorFormatted}`);
            
            // 健康度判定
            if (parseFloat(healthFactorFormatted) >= 1.0) {
                console.log('Status: HEALTHY (Health Factor >= 1.0)');
            } else {
                console.log('Status: UNHEALTHY (Health Factor < 1.0, liquidatable)');
            }
        }
        
    } catch (error) {
        console.error('Error querying health factor:', error.message);
        if (error.data) {
            console.error('Error data:', error.data);
        }
    }
}

// コマンドライン引数からpositionアドレスを取得
const positionAddress = process.argv[2];

if (!positionAddress) {
    console.error('Usage: node query-health-factor.js <position_address>');
    console.error('Example: node query-health-factor.js 0x1234567890123456789012345678901234567890');
    process.exit(1);
}

// positionアドレスの形式チェック
if (!ethers.isAddress(positionAddress)) {
    console.error('Invalid position address format');
    process.exit(1);
}

// 実行
queryPositionHealthFactor(positionAddress);