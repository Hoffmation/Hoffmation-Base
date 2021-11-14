import { RoomBase } from '../../../models/rooms/RoomBase';
import { ZigbeeAquaraWater } from '../zigbee/zigbeeAquaraWater';

export class WaterGroup {
  public constructor(private _room: RoomBase, public WaterDetectors: Array<ZigbeeAquaraWater>) {
    for (const w of [...WaterDetectors]) {
      w.room = this._room;
    }
  }

  public stopAlarm(): void {
    for (const d of this.WaterDetectors) {
      d.stopAlarm(true);
    }
  }
}
