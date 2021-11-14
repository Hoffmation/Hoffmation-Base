import { ZigbeeIkeaSteckdose } from '../zigbee/zigbeeIkeaSteckdose';
import { iLamp } from '../iLamp';
import { TimeCallbackService, TimeOfDay } from '../../services/time-callback-service';
import { ZigbeeIlluLedRGBCCT } from '../zigbee/zigbeeIlluLedRGBCCT';
import { iRoomBase } from '../../../models/rooms/iRoomBase';

export class LampenGroup {
  public constructor(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    private _room: iRoomBase,
    public Lampen: Array<iLamp>,
    public Stecker: Array<ZigbeeIkeaSteckdose>,
    public LED: Array<ZigbeeIlluLedRGBCCT> = [],
  ) {}

  public anyLightsOwn(): boolean {
    let i: number;
    for (i = 0; i < this.Lampen.length; i++) {
      if (this.Lampen[i].lightOn) {
        return true;
      }
    }
    for (i = 0; i < this.LED.length; i++) {
      if (this.LED[i].on) {
        return true;
      }
    }
    for (i = 0; i < this.Stecker.length; i++) {
      if (this.Stecker[i].steckerOn) {
        return true;
      }
    }
    return false;
  }

  public switchAll(target: boolean, force: boolean = false): void {
    this.setAllLampen(target, undefined, force);
    this.setAllStecker(target, undefined, force);

    this.LED.forEach((s) => {
      s.setLight(target);
    });
  }

  public switchTimeConditional(time: TimeOfDay): void {
    const darkOutside: boolean = TimeCallbackService.darkOutsideOrNight(time);

    let resultLampen = false;
    let resultSteckdosen = false;
    if (this.LED.length > 0) {
      this.LED.forEach((s) => {
        s.setTimeBased(time);
      });
    } else if (this.Stecker.length > 0) {
      resultSteckdosen = darkOutside;
    } else {
      resultLampen = darkOutside;
    }

    this.setAllLampen(resultLampen, time);
    this.setAllStecker(resultSteckdosen, time);
  }

  public setAllLampen(pValue: boolean, time?: TimeOfDay, force: boolean = false): void {
    if (this.Lampen?.length > 0) {
      this.Lampen.forEach((s) => {
        if (
          !pValue ||
          time === undefined ||
          (time === TimeOfDay.Night && s.settings.nightOn) ||
          (time === TimeOfDay.BeforeSunrise && s.settings.dawnOn) ||
          (time === TimeOfDay.AfterSunset && s.settings.duskOn)
        ) {
          const timeout: number = pValue && force ? 30 * 60 * 1000 : -1;
          s.setLight(pValue, timeout, force);
        }
      });
    }
  }

  public setAllStecker(pValue: boolean, time?: TimeOfDay, force: boolean = false): void {
    if (this.Stecker?.length > 0) {
      this.Stecker.forEach((s) => {
        if (
          !pValue ||
          time === undefined ||
          (time === TimeOfDay.Night && s.settings.nightOn) ||
          (time === TimeOfDay.BeforeSunrise && s.settings.dawnOn) ||
          (time === TimeOfDay.AfterSunset && s.settings.duskOn)
        ) {
          const timeout: number = pValue && force ? 30 * 60 * 1000 : -1;
          s.setStecker(pValue, timeout, force);
        }
      });
    }
  }

  public setAllLED(pValue: boolean, brightness: number = -1, color: string = '', colortemp: number = -1): void {
    this.LED.forEach((s) => {
      s.setLight(pValue, brightness, color, colortemp);
    });
  }
}
