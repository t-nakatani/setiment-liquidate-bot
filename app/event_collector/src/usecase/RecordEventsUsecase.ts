import { ITargetEventCollector } from "../application/ITargetEventCollector";
import { IEventRepository } from "../domain/IEventRepository";

export class RecordEventsUsecase {
  constructor(
    private readonly targetEventCollector: ITargetEventCollector,
    private readonly eventRepository: IEventRepository
  ) {}

  async handle(blockStart: number, blockEnd: number, batchSize: number): Promise<void> {
    const events = await this.targetEventCollector.collect(blockStart, blockEnd, batchSize);
    await this.eventRepository.save(events);
  }
}
