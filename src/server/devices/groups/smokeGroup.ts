import { RoomBase } from '../../../models/rooms/RoomBase';
import { ZigbeeHeimanSmoke } from '../zigbee/zigbeeHeimanSmoke';

export class SmokeGroup {
  public constructor(private _room: RoomBase, public Rauchmelder: Array<ZigbeeHeimanSmoke>) {
    for (const s of [...this.Rauchmelder]) {
      s.room = this._room;
    }
  }

  public stopAlarm(): void {
    for (const d of this.Rauchmelder) {
      d.stopAlarm(true);
    }
  }
}
