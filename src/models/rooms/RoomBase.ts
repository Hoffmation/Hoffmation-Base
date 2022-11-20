import { TimeCallback, TimeCallbackType, TimeOfDay } from '../timeCallback';
import {
  BaseGroup,
  DeviceCluster,
  GroupType,
  HeatGroup,
  LampenGroup,
  PraesenzGroup,
  RoomService,
  ServerLogService,
  ShutterService,
  SmokeGroup,
  SpeakerGroup,
  TasterGroup,
  TimeCallbackService,
  Utils,
  WaterGroup,
  WeatherService,
  WindowGroup,
} from '../../server';
import { LogLevel } from '../logLevel';
import { RoomDeviceAddingSettings, RoomSettingsController } from './RoomSettings';
import { iRoomBase } from './iRoomBase';
import { RoomInfo } from './roomInfo';
import _ from 'lodash';
import { iIdHolder } from '../iIdHolder';

export class RoomBase implements iRoomBase, iIdHolder {
  public info: RoomInfo;
  public sonnenAufgangCallback: TimeCallback | undefined;
  public sonnenUntergangCallback: TimeCallback | undefined;
  public sonnenAufgangLichtCallback: TimeCallback | undefined;
  public sonnenUntergangLichtCallback: TimeCallback | undefined;
  public skipNextRolloUp: boolean = false;
  public settings: RoomSettingsController;

  public constructor(
    public groupMap: Map<GroupType, BaseGroup>,
    public deviceAddingSettings: RoomDeviceAddingSettings,
    etage: number = 99,
  ) {
    this.info = new RoomInfo(deviceAddingSettings.RoomName, etage);
    this.settings = new RoomSettingsController(this);
    RoomService.addToRoomList(this);
  }

  /**
   * For Rooms the id is itss name
   * @returns {string} The Roomname
   */
  public get id(): string {
    return this.roomName;
  }

  public get customName(): string {
    return this.roomName;
  }

  protected _deviceCluster: DeviceCluster = new DeviceCluster();

  public get deviceCluster(): DeviceCluster {
    return this._deviceCluster;
  }

  public get WindowGroup(): WindowGroup | undefined {
    return this.groupMap.get(GroupType.Window) as WindowGroup | undefined;
  }

  public get PraesenzGroup(): PraesenzGroup | undefined {
    return this.groupMap.get(GroupType.Presence) as PraesenzGroup | undefined;
  }

  public get LampenGroup(): LampenGroup | undefined {
    return this.groupMap.get(GroupType.Light) as LampenGroup | undefined;
  }

  public get TasterGroup(): TasterGroup | undefined {
    return this.groupMap.get(GroupType.Buttons) as TasterGroup | undefined;
  }

  public get SonosGroup(): SpeakerGroup | undefined {
    return this.groupMap.get(GroupType.Speaker) as SpeakerGroup | undefined;
  }

  public get SmokeGroup(): SmokeGroup | undefined {
    return this.groupMap.get(GroupType.Smoke) as SmokeGroup | undefined;
  }

  public get WaterGroup(): WaterGroup | undefined {
    return this.groupMap.get(GroupType.Water) as WaterGroup | undefined;
  }

  public get HeatGroup(): HeatGroup | undefined {
    return this.groupMap.get(GroupType.Heating) as HeatGroup | undefined;
  }

  public get roomName(): string {
    return this.info.roomName;
  }

  public get etage(): number | undefined {
    return this.info.etage;
  }

  public initializeBase(): void {
    this.log(LogLevel.Debug, `RoomBase Init für ${this.roomName}`);
    this.recalcTimeCallbacks();
    this.PraesenzGroup?.initCallbacks();
    this.WindowGroup?.initialize();
    this.TasterGroup?.initCallbacks();
    this.HeatGroup?.initialize();
    if (this.settings.ambientLightAfterSunset && this.settings.lampOffset) {
      const cb: TimeCallback = new TimeCallback(
        `${this.roomName} Ambient Light after Sunset`,
        TimeCallbackType.SunSet,
        () => {
          this.log(LogLevel.Info, `Draußen wird es dunkel --> Aktiviere Ambientenbeleuchtung`);
          this.LampenGroup?.switchAll(true);
          Utils.guardedTimeout(
            () => {
              this.log(LogLevel.Info, `Ambientenbeleuchtung um Mitternacht abschalten.`);
              this.LampenGroup?.switchAll(false);
            },
            Utils.timeTilMidnight,
            this,
          );
        },
        this.settings.lampOffset.sunset,
      );
      this.sonnenUntergangLichtCallback = cb;
      TimeCallbackService.addCallback(cb);
    }
  }

  public persist(): void {
    Utils.dbo?.addRoom(this);
  }

  public recalcTimeCallbacks(): void {
    const now: Date = new Date();
    if (this.sonnenAufgangCallback && this.settings.rolloOffset) {
      this.sonnenAufgangCallback.minuteOffset = this.settings.rolloOffset.sunrise;
      this.sonnenAufgangCallback.sunTimeOffset = this.settings.rolloOffset;
      this.sonnenAufgangCallback.recalcNextToDo(now);
    }
    if (this.sonnenUntergangCallback && this.settings.rolloOffset) {
      this.sonnenUntergangCallback.minuteOffset = this.settings.rolloOffset.sunset;
      this.sonnenUntergangCallback.sunTimeOffset = this.settings.rolloOffset;
      if (this.settings.sonnenUntergangRolloAdditionalOffsetPerCloudiness > 0) {
        this.sonnenUntergangCallback.cloudOffset =
          WeatherService.getCurrentCloudiness() * this.settings.sonnenUntergangRolloAdditionalOffsetPerCloudiness;
      }
      this.sonnenUntergangCallback.recalcNextToDo(now);
    }
    if (this.sonnenAufgangLichtCallback && this.settings.lampOffset) {
      this.sonnenAufgangLichtCallback.minuteOffset = this.settings.lampOffset.sunrise;
      this.sonnenAufgangLichtCallback.recalcNextToDo(now);
    }
    if (this.sonnenUntergangLichtCallback && this.settings.lampOffset) {
      this.sonnenUntergangLichtCallback.minuteOffset = this.settings.lampOffset.sunset;
      this.sonnenUntergangLichtCallback.recalcNextToDo(now);
    }
  }

  /**
   * Sets the light based on the current time, rollo Position and room Settings
   * @param movementDependant Only turn light on if there was a movement in the same room
   */
  public setLightTimeBased(movementDependant: boolean = false): void {
    if (!this.LampenGroup) {
      this.log(LogLevel.Trace, 'Ignore "setLightTimeBased" as we have no lamps');
      return;
    }

    if (movementDependant && this.PraesenzGroup && !this.PraesenzGroup?.anyPresent()) {
      this.log(LogLevel.Trace, 'Turn off lights as no-one is present.');
      this.LampenGroup.switchAll(false);
      return;
    }

    if (!this.settings.lampOffset && !this.settings.roomIsAlwaysDark) {
      this.log(
        LogLevel.Alert,
        `Beim Aufruf von "setLightTimeBased" im Raum ${this.roomName} liegt kein Lampen Offset vor`,
      );
      return;
    }
    let timeOfDay: TimeOfDay = this.settings.roomIsAlwaysDark
      ? TimeOfDay.Night
      : TimeCallbackService.dayType(this.settings.lampOffset);
    if (
      timeOfDay === TimeOfDay.Daylight &&
      ((this.settings.lightIfNoWindows && (!this.WindowGroup || this.WindowGroup.windows.length === 0)) ||
        this.WindowGroup?.windows.some((f) => {
          return ShutterService.anyRolloDown(f.getShutter());
        }))
    ) {
      timeOfDay = Utils.nowTime().hours > 16 ? TimeOfDay.AfterSunset : TimeOfDay.BeforeSunrise;
    }
    this.LampenGroup.switchTimeConditional(timeOfDay);
  }

  public isNowLightTime(): boolean {
    if (!this.settings.lampOffset && !this.settings.roomIsAlwaysDark) {
      this.log(
        LogLevel.Alert,
        `Beim Aufruf von "setLightTimeBased" im Raum ${this.roomName} liegt kein Lampen Offset vor`,
      );
      return false;
    }
    let timeOfDay: TimeOfDay = this.settings.roomIsAlwaysDark
      ? TimeOfDay.Night
      : TimeCallbackService.dayType(this.settings.lampOffset);
    if (
      timeOfDay === TimeOfDay.Daylight &&
      this.WindowGroup?.windows.some((f) => {
        return ShutterService.anyRolloDown(f.getShutter());
      })
    ) {
      timeOfDay = TimeOfDay.AfterSunset;
    }
    return TimeCallbackService.darkOutsideOrNight(timeOfDay);
  }

  public toJSON(): Partial<RoomBase & { groupDict?: { [p: string]: BaseGroup } }> {
    return Utils.jsonFilter(_.omit(this, ['_deviceCluster']));
  }

  public log(level: LogLevel, message: string): void {
    ServerLogService.writeLog(level, message, {
      room: this.roomName,
    });
  }
}
