import { ethers } from "ethers";
import { ITargetEventCollector } from "../application/ITargetEventCollector";
import { PositionDeployedEvent } from "./PositionDeployedEvent";
import { NetworkClient } from "./NetworkClient";

export class PositionDeployedEventCollector implements ITargetEventCollector {
  public networkClient: NetworkClient;
  private contractInterface: ethers.Interface;
  private filter: ethers.Filter;
  constructor(
    private readonly contractAddress: string,
    private readonly eventName: string = "PositionDeployed",
    rpcUrl: string
  ) {
    this.networkClient = new NetworkClient(rpcUrl);

    const abi = ["event PositionDeployed(address indexed position, address indexed caller, address indexed owner)"];
    this.contractInterface = new ethers.Interface(abi);
    this.filter = this.createFilter();
  }

  async collect(blockStart: number, blockEnd: number, batchSize: number): Promise<PositionDeployedEvent[]> {
    const events: PositionDeployedEvent[] = [];

    for (let fromBlock = blockStart; fromBlock <= blockEnd; fromBlock += batchSize) {
      const toBlock = Math.min(fromBlock + batchSize - 1, blockEnd);
      try {
        const batchEvents = await this.getEventsMiniBatch(fromBlock, toBlock);
        events.push(...batchEvents);
      } catch (error) {
        console.error(`エラーが発生しました: ${error}`);
        console.error(`ブロック範囲: ${fromBlock} - ${toBlock}`);
      }
    }

    return events;
  }

  private createFilter(): ethers.Filter {
    const eventTopicHash = this.contractInterface.getEvent(this.eventName)!.topicHash;
    return {
      address: this.contractAddress,
      topics: [eventTopicHash],
    };
  }

  private async getEventsMiniBatch(fromBlock: number, toBlock: number): Promise<PositionDeployedEvent[]> {
    const logs = await this.networkClient.getLogs(this.filter, fromBlock, toBlock);

    const events: PositionDeployedEvent[] = [];
    for (const log of logs) {
      const parsedLog = this.contractInterface.parseLog(log);
      if (parsedLog && parsedLog.name === this.eventName) {
        const event = new PositionDeployedEvent({
          position: parsedLog.args.position,
          caller: parsedLog.args.caller,
          owner: parsedLog.args.owner,
        });
        events.push(event);
      }
    }
    return events;
  }
}
