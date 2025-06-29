const { ethers } = require('ethers');

const DEFAULT_BATCH_SIZE = 1000;

class NetworkClient {
  constructor(rpcUrl, options = {}) {
    this.rpcUrl = rpcUrl;
    this.batchSize = options.batchSize || DEFAULT_BATCH_SIZE;
    this.provider = null;
  }

  async initialize() {
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    
    const network = await this.provider.getNetwork();
    return {
      name: network.name,
      chainId: Number(network.chainId)
    };
  }

  async getLatestBlockNumber() {
    return await this.provider.getBlockNumber();
  }

  async getLogs(filter, fromBlock, toBlock) {
    return await this.provider.getLogs({
      ...filter,
      fromBlock,
      toBlock
    });
  }

  getBatchSize() {
    return this.batchSize;
  }
}

module.exports = NetworkClient;