import { RoomSettings } from './RoomSettings/RoomSettings';

export class RoomInfo {
  public etage?: number;
  public constructor(public roomName: string, settings: RoomSettings) {
    this.etage = settings.etage;
  }
}
