import { RecordEventsUsecase } from "./usecase/RecordEventsUsecase";
import { PositionDeployedEventCollector } from "./infrastructure/PositionDeployedEventCollectorImpl";
import { PositionDeployedEventRepository } from "./infrastructure/PositionDeployedEventRepository";
import AppConfig from "./config/AppDonfig";

const contractAddress = AppConfig.CONTRACT_ADDRESS || "0xE019Ce6e80dFe505bca229752A1ad727E14085a4";
const rpcUrl = AppConfig.RPC_URL || "https://hyperliquid.drpc.org";

const batchSize = 500;

async function main() {
  try {
    const positionDeployedEventCollector = new PositionDeployedEventCollector(
      contractAddress,
      "PositionDeployed",
      rpcUrl
    );

    const latestBlock = await positionDeployedEventCollector.networkClient.getLatestBlock();

    const blockStart = 4200000;
    const blockEnd = 5200000;

    for (let i = blockStart; i <= blockEnd; i += 100000) {
      console.log(`最新ブロック: ${latestBlock}`);
      console.log(`スキャン範囲: ブロック ${blockStart} - ${blockEnd}`);

      const positionDeployedEventRepository = new PositionDeployedEventRepository("./output", i, i + 100000);

      await collect(positionDeployedEventCollector, positionDeployedEventRepository, i, i + 100000, batchSize);
    }
  } catch (error) {
    console.error("エラーが発生しました:", error);
    process.exit(1);
  }
}

async function collect(
  positionDeployedEventCollector: PositionDeployedEventCollector,
  positionDeployedEventRepository: PositionDeployedEventRepository,
  blockStart: number,
  blockEnd: number,
  batchSize: number
) {
  const events = await positionDeployedEventCollector.collect(blockStart, blockEnd, batchSize);
  console.log(`${events.length}個のイベントを取得しました`);

  await positionDeployedEventRepository.save(events);
  console.log("CSVファイルに保存完了");
}

main();
