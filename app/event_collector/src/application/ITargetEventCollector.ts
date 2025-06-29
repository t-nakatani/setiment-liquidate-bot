import { Event } from "../domain/Event";

export interface ITargetEventCollector {
  collect(blockStart: number, blockEnd: number, batchSize: number): Promise<Event[]>;
}
