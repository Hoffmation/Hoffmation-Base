import { TimeCallbackService, Utils } from '../../services';
import { BaseGroup } from './base-group';
import { GroupType } from './group-type';
import { DeviceClusterType } from '../device-cluster-type';
import { DeviceList } from '../device-list';
import { iActuator, iLamp } from '../baseDeviceInterfaces';
import { LogLevel, RoomBase, TimeCallback, TimeCallbackType, TimeOfDay } from '../../../models';
import { WledDevice } from '../wledDevice';
import { iLedRgbCct } from '../baseDeviceInterfaces/iLedRgbCct';
import _ from 'lodash';

export class LampenGroup extends BaseGroup {
  public sonnenAufgangLichtCallback: TimeCallback | undefined;
  public sonnenUntergangLichtCallback: TimeCallback | undefined;

  public constructor(
    roomName: string,
    lampenIds: string[] = [],
    steckerIds: string[] = [],
    ledIds: string[] = [],
    wledIds: string[] = [],
  ) {
    super(roomName, GroupType.Light);
    this.deviceCluster.deviceMap.set(DeviceClusterType.Lamps, new DeviceList(lampenIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.Outlets, new DeviceList(steckerIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.LED, new DeviceList(ledIds));
    this.deviceCluster.deviceMap.set(DeviceClusterType.WLED, new DeviceList(wledIds));
  }

  public anyLightsOn(): boolean {
    let i: number;
    for (i = 0; i < this.getLampen().length; i++) {
      if (this.getLampen()[i].lightOn) {
        return true;
      }
    }
    for (i = 0; i < this.getLED().length; i++) {
      if (this.getLED()[i].actuatorOn) {
        return true;
      }
    }
    for (i = 0; i < this.getStecker().length; i++) {
      if (this.getStecker()[i].actuatorOn) {
        return true;
      }
    }
    for (i = 0; i < this.getWled().length; i++) {
      if (this.getWled()[i].on) {
        return true;
      }
    }
    return false;
  }

  public getLampen(): iLamp[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.Lamps) as iLamp[];
  }

  public getLED(): iLedRgbCct[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.LED) as iLedRgbCct[];
  }

  public getWled(): WledDevice[] {
    return this.deviceCluster.getIoBrokerDevicesByType(DeviceClusterType.WLED) as WledDevice[];
  }

  public getStecker(): iActuator[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.Outlets) as iActuator[];
  }

  public handleSunriseOff(): void {
    if (!this.anyLightsOn()) {
      return;
    }
    this.log(LogLevel.Info, `Es ist hell genug --> Schalte Lampen im ${this.roomName} aus`);
    this.switchAll(false);
  }

  public switchAll(target: boolean, force: boolean = false): void {
    this.setAllLampen(target, undefined, force);
    this.setAllStecker(target, undefined, force);

    this.getLED().forEach((s) => {
      s.setLight(target);
    });

    this.getWled().forEach((wled) => {
      wled.setLight(target);
    });
  }

  public switchTimeConditional(time: TimeOfDay): void {
    const darkOutside: boolean = TimeCallbackService.darkOutsideOrNight(time);

    let resultLampen = false;
    let resultSteckdosen = false;
    if (this.getWled().length > 0) {
      this.log(LogLevel.Debug, `Set Wled time based for time "${TimeOfDay[time]}"`);
      this.getWled().forEach((wled) => {
        wled.setTimeBased(time);
      });
    }
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
        s.setActuator(pValue, timeout, force);
      }
    });
  }

  public setAllLED(pValue: boolean, brightness: number = -1, color: string = '', colortemp: number = -1): void {
    this.getLED().forEach((s) => {
      s.setLight(pValue, undefined, true, brightness, undefined, color, colortemp);
    });
  }

  public setAllWled(pValue: boolean, brightness: number = -1, preset?: number): void {
    this.getWled().forEach((w) => {
      w.setWled(pValue, brightness, preset);
    });
  }

  public initialize(): void {
    this.recalcTimeCallbacks();
  }

  public recalcTimeCallbacks(): void {
    this.reconfigureSunriseTimeCallback();
    this.reconfigureSunsetTimeCallback();
  }

  public toJSON(): Partial<LampenGroup> {
    return Utils.jsonFilter(_.omit(this, ['_deviceCluster']));
  }

  private reconfigureSunriseTimeCallback(): void {
    const room: RoomBase = this.getRoom();
    if (!room.settings.lichtSonnenAufgangAus || !room.settings.lampOffset) {
      if (this.sonnenAufgangLichtCallback !== undefined) {
        this.log(LogLevel.Trace, `Remove Sunrise Lamp callback for ${this.roomName}`);
        TimeCallbackService.removeCallback(this.sonnenAufgangLichtCallback);
        this.sonnenAufgangLichtCallback = undefined;
      }
      return;
    }
    if (this.sonnenAufgangLichtCallback && room.settings.lampOffset) {
      this.sonnenAufgangLichtCallback.minuteOffset = room.settings.lampOffset.sunrise;
      this.sonnenAufgangLichtCallback.recalcNextToDo(new Date());
    }
    if (this.sonnenAufgangLichtCallback === undefined) {
      this.log(LogLevel.Trace, `Add Sunrise lamp TimeCallback for ${this.roomName}`);
      const cb: TimeCallback = new TimeCallback(
        `${this.roomName} Morgens Lampe aus`,
        TimeCallbackType.Sunrise,
        () => {
          this.handleSunriseOff();
        },
        this.getRoom().settings.lampOffset.sunrise,
      );
      this.sonnenAufgangLichtCallback = cb;
      TimeCallbackService.addCallback(cb);
    }
  }

  private reconfigureSunsetTimeCallback(): void {
    const room: RoomBase = this.getRoom();
    if (!room.settings.ambientLightAfterSunset || !room.settings.lampOffset) {
      if (this.sonnenUntergangLichtCallback !== undefined) {
        this.log(LogLevel.Trace, `Remove Sunset Lamp callback for ${this.roomName}`);
        TimeCallbackService.removeCallback(this.sonnenUntergangLichtCallback);
        this.sonnenUntergangLichtCallback = undefined;
      }
      return;
    }
    if (this.sonnenUntergangLichtCallback && room.settings.lampOffset) {
      this.sonnenUntergangLichtCallback.minuteOffset = room.settings.lampOffset.sunset;
      this.sonnenUntergangLichtCallback.recalcNextToDo(new Date());
    }
    if (this.sonnenUntergangLichtCallback === undefined) {
      this.log(LogLevel.Trace, `Add Sunset Light TimeCallback for ${this.roomName}`);
      const cb: TimeCallback = new TimeCallback(
        `${this.roomName} Ambient Light after Sunset`,
        TimeCallbackType.SunSet,
        () => {
          this.log(LogLevel.Info, `Draußen wird es dunkel --> Aktiviere Ambientenbeleuchtung`);
          this.switchAll(true);
          Utils.guardedTimeout(
            () => {
              this.log(LogLevel.Info, `Ambientenbeleuchtung um Mitternacht abschalten.`);
              this.switchAll(false);
            },
            Utils.timeTilMidnight,
            this,
          );
        },
        this.getRoom().settings.lampOffset.sunset,
      );
      this.sonnenUntergangLichtCallback = cb;
      TimeCallbackService.addCallback(cb);
    }
  }
}
