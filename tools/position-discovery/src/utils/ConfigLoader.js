const fs = require('fs');
const path = require('path');

class ConfigLoader {
  static load(configPath = './config.json') {
    try {
      const fullPath = path.resolve(configPath);
      const configData = fs.readFileSync(fullPath, 'utf8');
      const config = JSON.parse(configData);
      
      ConfigLoader._validateConfig(config);
      return config;
    } catch (error) {
      throw new Error(`設定ファイルの読み込みに失敗: ${error.message}`);
    }
  }

  static _validateConfig(config) {
    const required = [
      'network.rpcUrl',
      'network.chainId', 
      'contracts.positionManager.address'
    ];
    
    for (const path of required) {
      if (!ConfigLoader._getNestedValue(config, path)) {
        throw new Error(`必須設定項目が不足: ${path}`);
      }
    }
    
    if (!ConfigLoader._isValidAddress(config.contracts.positionManager.address)) {
      throw new Error('PositionManagerアドレスが無効です');
    }
    
    if (typeof config.network.chainId !== 'number') {
      throw new Error('chainIdは数値である必要があります');
    }
  }

  static _getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }

  static _isValidAddress(address) {
    return typeof address === 'string' && 
           address.length === 42 && 
           address.startsWith('0x') &&
           /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  static getNetworkOptions(config) {
    return {
      batchSize: config.scanning?.batchSize || 1000
    };
  }
}

module.exports = ConfigLoader;