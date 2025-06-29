import { IEventRepository } from "../domain/IEventRepository";
import { Event } from "../domain/Event";
import { CsvEventRepository } from "./CsvEventRepository";

export class PositionDeployedEventRepository implements IEventRepository {
  private csvRepository: CsvEventRepository;

  constructor(outputDir: string = "./output", blockStart?: number, blockEnd?: number) {
    this.csvRepository = new CsvEventRepository(outputDir, blockStart, blockEnd);
  }

  async save(events: Event[]): Promise<void> {
    await this.csvRepository.save(events);
  }
}
