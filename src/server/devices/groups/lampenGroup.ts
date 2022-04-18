import { ZigbeeIkeaSteckdose, ZigbeeIlluLedRGBCCT } from '../zigbee';
import { TimeCallbackService } from '../../services';
import { BaseGroup } from './base-group';
import { GroupType } from './group-type';
import { DeviceClusterType } from '../device-cluster-type';
import { DeviceList } from '../device-list';
import { iLamp } from '../iLamp';
import { LogLevel, TimeOfDay } from '../../../models';

export class LampenGroup extends BaseGroup {
  public constructor(roomName: string, lampenIds: string[] = [], steckerIds: string[] = [], ledIds: string[] = []) {
    super(roomName, GroupType.Light);
    this.deviceCluster.deviceMap.set(DeviceClusterType.Lamps, new DeviceList(lampenIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.Outlets, new DeviceList(steckerIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.LED, new DeviceList(ledIds));
  }

  public anyLightsOwn(): boolean {
    let i: number;
    for (i = 0; i < this.getLampen().length; i++) {
      if (this.getLampen()[i].lightOn) {
        return true;
      }
    }
    for (i = 0; i < this.getLED().length; i++) {
      if (this.getLED()[i].on) {
        return true;
      }
    }
    for (i = 0; i < this.getStecker().length; i++) {
      if (this.getStecker()[i].steckerOn) {
        return true;
      }
    }
    return false;
  }

  public getLampen(): iLamp[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.Lamps) as iLamp[];
  }

  public getLED(): ZigbeeIlluLedRGBCCT[] {
    return this.deviceCluster.getIoBrokerDevicesByType(DeviceClusterType.LED) as ZigbeeIlluLedRGBCCT[];
  }

  public getStecker(): ZigbeeIkeaSteckdose[] {
    return this.deviceCluster.getIoBrokerDevicesByType(DeviceClusterType.Outlets) as ZigbeeIkeaSteckdose[];
  }

  public switchAll(target: boolean, force: boolean = false): void {
    this.setAllLampen(target, undefined, force);
    this.setAllStecker(target, undefined, force);

    this.getLED().forEach((s) => {
      s.setLight(target);
    });
  }

  public switchTimeConditional(time: TimeOfDay): void {
    const darkOutside: boolean = TimeCallbackService.darkOutsideOrNight(time);

    let resultLampen = false;
    let resultSteckdosen = false;
    if (this.getLED().length > 0) {
      this.log(LogLevel.Trace, `Set LEDs time based for time "${TimeOfDay[time]}"`);
      this.getLED().forEach((s) => {
        s.setTimeBased(time);
      });
    } else if (this.getStecker().length > 0) {
      this.log(LogLevel.Trace, `Set outlets time based for time "${TimeOfDay[time]}"`);
      resultSteckdosen = darkOutside;
    } else {
      this.log(LogLevel.Trace, `Set Lamps time based for time "${TimeOfDay[time]}"`);
      resultLampen = darkOutside;
    }

    this.setAllLampen(resultLampen, time);
    this.setAllStecker(resultSteckdosen, time);
  }

  public setAllLampen(pValue: boolean, time?: TimeOfDay, force: boolean = false, timeout?: number): void {
    this.getLampen().forEach((s) => {
      if (
        !pValue ||
        time === undefined ||
        (time === TimeOfDay.Night && s.settings.nightOn) ||
        (time === TimeOfDay.BeforeSunrise && s.settings.dawnOn) ||
        (time === TimeOfDay.AfterSunset && s.settings.duskOn)
      ) {
        timeout ??= pValue && force ? 30 * 60 * 1000 : -1;

        if (pValue && time !== undefined) {
          s.setTimeBased(time, timeout, force);
        } else {
          s.setLight(pValue, timeout, force);
        }
      }
    });
  }

  public setAllStecker(pValue: boolean, time?: TimeOfDay, force: boolean = false): void {
    this.getStecker().forEach((s) => {
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

  public setAllLED(pValue: boolean, brightness: number = -1, color: string = '', colortemp: number = -1): void {
    this.getLED().forEach((s) => {
      s.setLight(pValue, brightness, color, colortemp);
    });
  }
}
