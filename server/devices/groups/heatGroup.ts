import { RoomBase } from '../../../models/rooms/RoomBase';
import { HmIpHeizgruppe } from '../hmIPDevices/hmIpHeizgruppe';

export class HeatGroup {
  public get currentTemp(): number {
    if (this.heaters.length === 0) {
      return -99;
    }
    let value: number = 0;
    for (const h of this.heaters) {
      value += h.iTemperatur;
    }
    return Math.round((value / this.heaters.length) * 10) / 10;
  }

  public get desiredTemp(): number {
    if (this.heaters.length === 0) {
      return -99;
    }
    let value: number = 0;
    for (const h of this.heaters) {
      value += h.desiredTemperatur;
    }
    return Math.round((value / this.heaters.length) * 10) / 10;
  }

  public constructor(private _room: RoomBase, public heaters: HmIpHeizgruppe[]) {
    for (const h of [...heaters]) {
      h.room = this._room;
    }
  }
}
