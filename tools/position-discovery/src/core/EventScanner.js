class EventScanner {
  constructor(networkClient, eventFilter) {
    this.networkClient = networkClient;
    this.eventFilter = eventFilter;
  }

  async scanByBlockRange(startBlock, endBlock, options = {}) {
    const { onProgress } = options;

    const filter = this.eventFilter.createFilter();
    const batchSize = this.networkClient.getBatchSize();
    const events = [];

    let currentBlock = startBlock;

    while (currentBlock <= endBlock) {
      const toBlock = Math.min(currentBlock + batchSize - 1, endBlock);

      if (onProgress) {
        onProgress({
          type: "batch_start",
          fromBlock: currentBlock,
          toBlock,
          totalBlocks: endBlock - startBlock + 1,
          processedBlocks: currentBlock - startBlock,
        });
      }

      try {
        const logs = await this.networkClient.getLogs(filter, currentBlock, toBlock);

        for (const log of logs) {
          const parsedEvent = this.eventFilter.parseLog(log);
          events.push(parsedEvent);
        }

        if (onProgress) {
          onProgress({
            type: "batch_complete",
            fromBlock: currentBlock,
            toBlock,
            eventsFound: logs.length,
            totalEvents: events.length,
          });
        }
      } catch (error) {
        if (onProgress) {
          onProgress({
            type: "batch_error",
            fromBlock: currentBlock,
            toBlock,
            error: error.message,
          });
        }
        console.error(`バッチ ${currentBlock}-${toBlock} でエラー発生: ${error.message}`);
      }

      currentBlock = toBlock + 1;
    }

    return events;
  }

  async scanFromLatestBlocks(blockCount, options = {}) {
    const latestBlock = await this.networkClient.getLatestBlockNumber();
    const startBlock = Math.max(0, latestBlock - blockCount + 1);

    return await this.scanByBlockRange(startBlock, latestBlock, options);
  }
}

module.exports = EventScanner;
