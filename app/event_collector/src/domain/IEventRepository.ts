import { Event } from "./Event";

export interface IEventRepository {
  save(events: Event[]): Promise<void>;
}
