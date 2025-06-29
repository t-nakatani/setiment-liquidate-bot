import { Event } from "../domain/Event";

export type Address = string;

export interface PositionDeployedData {
  position: Address;
  caller: Address;
  owner: Address;
}

export class PositionDeployedEvent implements Event {
  name: string = "position-deployed";
  data: PositionDeployedData;

  constructor(data: PositionDeployedData) {
    this.data = data;
  }
}
