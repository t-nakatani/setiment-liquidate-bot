const { ethers } = require('ethers');

const POSITION_DEPLOYED_ABI = [
  "event PositionDeployed(address indexed position, address indexed caller, address indexed owner)"
];

class EventFilter {
  constructor(contractAddress, eventName = 'PositionDeployed') {
    this.contractAddress = contractAddress;
    this.eventName = eventName;
    this.contractInterface = new ethers.Interface(POSITION_DEPLOYED_ABI);
  }

  createFilter() {
    const eventTopicHash = this.contractInterface.getEvent(this.eventName).topicHash;
    
    return {
      address: this.contractAddress,
      topics: [eventTopicHash]
    };
  }

  parseLog(log) {
    try {
      const parsed = this.contractInterface.parseLog(log);
      return {
        eventName: parsed.name,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.logIndex || 0,
        args: {
          position: parsed.args.position,
          caller: parsed.args.caller,
          owner: parsed.args.owner
        }
      };
    } catch (error) {
      throw new Error(`ログの解析に失敗: ${error.message}`);
    }
  }

}

module.exports = EventFilter;