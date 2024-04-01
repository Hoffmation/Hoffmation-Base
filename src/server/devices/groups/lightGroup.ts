import { TimeCallbackService, Utils } from '../../services';
import { BaseGroup } from './base-group';
import { GroupType } from './group-type';
import { DeviceClusterType } from '../device-cluster-type';
import { DeviceList } from '../device-list';
import { iActuator, iLamp } from '../baseDeviceInterfaces';
import {
  ActuatorSetStateCommand,
  CommandSource,
  LampSetLightCommand,
  LampSetTimeBasedCommand,
  LedSetLightCommand,
  LightGroupSwitchTimeConditionalCommand,
  LogLevel,
  RoomBase,
  TimeCallback,
  TimeCallbackType,
  TimeOfDay,
  WledSetLightCommand,
} from '../../../models';
import { WledDevice } from '../wledDevice';
import { iLedRgbCct } from '../baseDeviceInterfaces/iLedRgbCct';

export class LightGroup extends BaseGroup {
  /**
   * Time-Callback for the sunrise light off
   * @remark This is undefined if the light should not be turned off at sunrise or no calculation has been done yet
   */
  public sonnenAufgangLichtCallback: TimeCallback | undefined;
  /**
   * Time-Callback for the sunset light on
   * @remark This is undefined if the light should not be turned on at sunset or no calculation has been done yet
   */
  public sonnenUntergangLichtCallback: TimeCallback | undefined;
  private _ambientLightOn: boolean = false;

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
    return (
      this.getAllAsActuator().find((a: iActuator) => {
        return a.actuatorOn;
      }) !== undefined
    );
  }

  public getLights(): iLamp[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.Lamps) as iLamp[];
  }

  public getLED(): iLedRgbCct[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.LED) as iLedRgbCct[];
  }

  public getWled(): WledDevice[] {
    return this.deviceCluster.getIoBrokerDevicesByType(DeviceClusterType.WLED) as WledDevice[];
  }

  public getOutlets(): iActuator[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.Outlets) as iActuator[];
  }

  public getAllAsActuator(): iActuator[] {
    const result: iActuator[] = [];
    result.push(...this.getLights());
    result.push(...this.getOutlets());
    result.push(...this.getLED());
    result.push(...this.getWled());
    return result;
  }

  public handleSunriseOff(): void {
    if (!this.anyLightsOn()) {
      return;
    }
    this.log(LogLevel.Info, `Es ist hell genug --> Schalte Lampen im ${this.roomName} aus`);
    this.switchAll(new ActuatorSetStateCommand(CommandSource.Automatic, false, 'LightGroup handleSunriseOff'));
  }

  public switchAll(c: ActuatorSetStateCommand): void {
    this.getAllAsActuator().forEach((a) => {
      if (a.settings.includeInAmbientLight && !c.isForceAction && !c.on && this._ambientLightOn) {
        a.log(
          LogLevel.Info,
          `Ambient light mode is active --> Skip non force light off command in ${this.roomName}; command: ${c.logMessage}`,
        );
        return;
      }
      a.setActuator(c);
    });
  }

  public switchTimeConditional(c: LightGroupSwitchTimeConditionalCommand): void {
    const darkOutside: boolean = TimeCallbackService.darkOutsideOrNight(c.time);

    let resultLampen = false;
    let resultSteckdosen = false;
    let activatedGroups = 0;
    const command: LampSetTimeBasedCommand = new LampSetTimeBasedCommand(c, c.time, 'LightGroup switchTimeConditional');
    if (this.getWled().length > 0) {
      activatedGroups++;
      this.log(LogLevel.Debug, `Set Wled time based for time "${TimeOfDay[c.time]}"`);
      this.getWled().forEach((wled) => {
        wled.setTimeBased(command);
      });
    }
    if (this.getLED().length > 0) {
      activatedGroups++;
      this.log(LogLevel.Trace, `Set LEDs time based for time "${TimeOfDay[c.time]}"`);
      this.getLED().forEach((s) => {
        s.setTimeBased(command);
      });
    }
    if (this.getOutlets().length > 0) {
      activatedGroups++;
      this.log(LogLevel.Trace, `Set outlets time based for time "${TimeOfDay[c.time]}"`);
      resultSteckdosen = darkOutside;
    }
    if (activatedGroups === 0 || this.getRoom().settings.includeLampsInNormalMovementLightning) {
      this.log(LogLevel.Trace, `Set Lamps time based for time "${TimeOfDay[c.time]}"`);
      resultLampen = darkOutside;
    }

    if (resultLampen) {
      this.setAllLampenTimeBased(new LampSetTimeBasedCommand(c, c.time));
    } else {
      this.setAllLampen(new LampSetLightCommand(c, false));
    }
    if (resultSteckdosen) {
      this.setAllActuatorsTimeBased(new LampSetTimeBasedCommand(c, c.time));
    } else {
      this.setAllOutlets(new ActuatorSetStateCommand(c, false));
    }
  }

  public setAllLampen(c: LampSetLightCommand): void {
    this.getLights().forEach((s) => {
      s.setLight(c);
    });
  }

  public setAllLampenTimeBased(c: LampSetTimeBasedCommand): void {
    this.getLights().forEach((s) => {
      s.setTimeBased(c);
    });
  }

  public setAllOutlets(c: ActuatorSetStateCommand): void {
    this.getOutlets().forEach((s) => {
      s.setActuator(c);
    });
  }

  public setAllActuatorsTimeBased(c: LampSetTimeBasedCommand): void {
    this.getOutlets().forEach((s) => {
      if (
        (c.time === TimeOfDay.Daylight && s.settings.dayOn) ||
        (c.time === TimeOfDay.Night && s.settings.nightOn) ||
        (c.time === TimeOfDay.BeforeSunrise && s.settings.dawnOn) ||
        (c.time === TimeOfDay.AfterSunset && s.settings.duskOn)
      ) {
        s.setActuator(
          new ActuatorSetStateCommand(c, true, 'LightGroup setAllActuatorsTimeBased', c.disableAutomaticCommand),
        );
      }
    });
  }

  public setAllLED(c: LedSetLightCommand): void {
    this.getLED().forEach((s) => {
      s.setLight(c);
    });
  }

  public setAllWled(c: WledSetLightCommand): void {
    this.getWled().forEach((w) => {
      w.setWled(c);
    });
  }

  public initialize(): void {
    this.recalculateTimeCallbacks();
  }

  public recalculateTimeCallbacks(): void {
    this.reconfigureSunriseTimeCallback();
    this.reconfigureSunsetTimeCallback();
  }

  private reconfigureSunriseTimeCallback(): void {
    const room: RoomBase = this.getRoom();
    if (!room.settings.lichtSonnenAufgangAus || !room.settings.lampOffset) {
      if (this.sonnenAufgangLichtCallback !== undefined) {
        this.log(LogLevel.Debug, `Remove Sunrise Lamp callback for ${this.roomName}`);
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
      this.log(LogLevel.Debug, `Add Sunrise lamp TimeCallback for ${this.roomName}`);
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
        this.log(LogLevel.Debug, `Remove Sunset Lamp callback for ${this.roomName}`);
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
      this.log(LogLevel.Debug, `Add Sunset Light TimeCallback for ${this.roomName}`);
      const cb: TimeCallback = new TimeCallback(
        `${this.roomName} Ambient Light after Sunset`,
        TimeCallbackType.SunSet,
        this.ambientLightStartCallback.bind(this),
        this.getRoom().settings.lampOffset.sunset,
      );
      this.sonnenUntergangLichtCallback = cb;
      TimeCallbackService.addCallback(cb);
    }
  }

  private ambientLightStartCallback(): void {
    this._ambientLightOn = true;
    this.log(LogLevel.Info, 'Draußen wird es dunkel --> Aktiviere Ambientenbeleuchtung');

    this.getAllAsActuator().forEach((a) => {
      if (a.settings.includeInAmbientLight) {
        a.setActuator(new ActuatorSetStateCommand(CommandSource.Automatic, true, 'Ambient Light Start Callback'));
      }
    });
    Utils.guardedTimeout(
      () => {
        this.log(LogLevel.Info, 'Ambientenbeleuchtung um Mitternacht abschalten.');
        this._ambientLightOn = false;
        if (this.getRoom().PraesenzGroup?.anyPresent() !== true) {
          this.switchAll(new ActuatorSetStateCommand(CommandSource.Automatic, false, 'Ambient Light End Callback'));
        }
      },
      Utils.timeTilMidnight,
      this,
    );
  }
}
