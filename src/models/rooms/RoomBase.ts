import { TimeCallback, TimeOfDay } from '../timeCallback';
import {
  BaseGroup,
  DeviceCluster,
  GroupType,
  HeatGroup,
  LampenGroup,
  PresenceGroup,
  RoomService,
  ServerLogService,
  ShutterService,
  SmokeGroup,
  SpeakerGroup,
  TasterGroup,
  TimeCallbackService,
  Utils,
  WaterGroup,
  WindowGroup,
} from '../../server';
import { LogLevel } from '../logLevel';
import { RoomSettingsController } from './RoomSettings';
import { iRoomBase } from './iRoomBase';
import { RoomInfo } from './roomInfo';
import _ from 'lodash';
import { iIdHolder } from '../iIdHolder';

export class RoomBase implements iRoomBase, iIdHolder {
  public info: RoomInfo;
  public skipNextRolloUp: boolean = false;
  public settings: RoomSettingsController;

  public constructor(public groupMap: Map<GroupType, BaseGroup>, roomName: string, etage: number = 99) {
    this.info = new RoomInfo(roomName, etage);
    this.settings = new RoomSettingsController(this);
    RoomService.addToRoomList(this);
  }

  public get sonnenUntergangLichtCallback(): TimeCallback | undefined {
    return this.LampenGroup?.sonnenUntergangLichtCallback;
  }

  public get sonnenAufgangLichtCallback(): TimeCallback | undefined {
    return this.LampenGroup?.sonnenAufgangLichtCallback;
  }

  public get sunriseShutterCallback(): TimeCallback | undefined {
    return this.WindowGroup?.sunriseShutterCallback;
  }

  public get sunsetShutterCallback(): TimeCallback | undefined {
    return this.WindowGroup?.sunsetShutterCallback;
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

  public get PraesenzGroup(): PresenceGroup | undefined {
    return this.groupMap.get(GroupType.Presence) as PresenceGroup | undefined;
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
    this.LampenGroup?.initialize();
    this.TasterGroup?.initCallbacks();
    this.HeatGroup?.initialize();
  }

  public persist(): void {
    Utils.dbo?.addRoom(this);
  }

  public recalcTimeCallbacks(): void {
    this.WindowGroup?.recalcTimeCallbacks();
    this.LampenGroup?.recalcTimeCallbacks();
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
