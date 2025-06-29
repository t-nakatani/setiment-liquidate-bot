import { ethers } from "ethers";

export class NetworkClient {
  private provider: ethers.JsonRpcProvider | null = null;
  private interval: number = 500;

  constructor(private readonly rpcUrl: string, private readonly batchSize: number = 1000) {
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
  }

  async getLogs(filter: ethers.Filter, fromBlock: number, toBlock: number): Promise<ethers.Log[]> {
    if (!this.provider) {
      throw new Error("NetworkClient is not initialized");
    }

    await new Promise((resolve) => setTimeout(resolve, this.interval));

    return await this.provider.getLogs({
      ...filter,
      fromBlock,
      toBlock,
    });
  }

  async getLatestBlock(): Promise<number> {
    if (!this.provider) {
      throw new Error("NetworkClient is not initialized");
    }

    return await this.provider.getBlockNumber();
  }

  getBatchSize(): number {
    return this.batchSize;
  }
}
