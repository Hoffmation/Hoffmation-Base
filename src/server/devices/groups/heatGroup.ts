import { RoomBase } from 'index';
import { HmIpHeizgruppe } from 'index';

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

  public constructor(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    private _room: RoomBase,
    public heaters: HmIpHeizgruppe[],
  ) {}
}
