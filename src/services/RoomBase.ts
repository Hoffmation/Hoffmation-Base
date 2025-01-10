import _ from 'lodash';
import {
  BaseGroup,
  DeviceCluster,
  HeatGroup,
  LightGroup,
  PresenceGroup,
  SmokeGroup,
  SpeakerGroup,
  TasterGroup,
  Trilateration,
  WaterGroup,
  WindowGroup,
} from '../devices';
import {
  ActuatorSetStateCommand,
  LightGroupSwitchTimeConditionalCommand,
  RoomInfo,
  RoomSetLightTimeBasedCommand,
  RoomSettingsController,
  TimeCallback,
} from '../models';
import { iIdHolder, iRoomBase, ITimeCallback, iTrilaterationPoint } from '../interfaces';
import { RoomService } from './room-service';
import { Utils } from '../utils';
import { DeviceClusterType, GroupType, LogLevel, TimeOfDay } from '../enums';
import { ServerLogService } from '../logging';
import { Persistence } from './dbo';
import { TimeCallbackService } from './time-callback-service';
import { ShutterService } from './ShutterService';

export class RoomBase implements iRoomBase, iIdHolder {
  /**
   * @see RoomInfo
   */
  public info: RoomInfo;
  /** @inheritDoc */
  public skipNextRolloUp: boolean = false;
  /**
   * The settings for this room
   */
  public settings: RoomSettingsController;

  public constructor(
    public groupMap: Map<GroupType, BaseGroup>,
    roomName: string,
    etage: number = 99,
    startPoint?: iTrilaterationPoint,
    endPoint?: iTrilaterationPoint,
  ) {
    this.info = new RoomInfo(roomName, etage);
    this.settings = new RoomSettingsController(this);
    RoomService.addToRoomList(this);
    if (startPoint !== undefined && endPoint !== undefined) {
      Trilateration.addRoom(this, startPoint, endPoint);
    }
  }

  public get sonnenUntergangLichtCallback(): ITimeCallback | undefined {
    return this.LightGroup?.sonnenUntergangLichtCallback;
  }

  public get sonnenAufgangLichtCallback(): TimeCallback | undefined {
    return this.LightGroup?.sonnenAufgangLichtCallback;
  }

  public get sunriseShutterCallback(): TimeCallback | undefined {
    return this.WindowGroup?.sunriseShutterCallback;
  }

  public get sunsetShutterCallback(): TimeCallback | undefined {
    return this.WindowGroup?.sunsetShutterCallback;
  }

  /**
   * For Rooms the id is itss name
   * @returns The Roomname
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

  public get LightGroup(): LightGroup | undefined {
    return this.groupMap.get(GroupType.Light) as LightGroup | undefined;
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
    this.LightGroup?.initialize();
    this.TasterGroup?.initCallbacks();
    this.HeatGroup?.initialize();
    for (const group of this.groupMap.values()) {
      RoomService.Groups.set(group.id, group);
    }
  }

  public persist(): void {
    Persistence.dbo?.addRoom(this);
  }

  public recalcTimeCallbacks(): void {
    this.WindowGroup?.recalcTimeCallbacks();
    this.LightGroup?.recalculateTimeCallbacks();
  }

  /**
   * Sets the light based on the current time, rollo Position and room Settings
   * @param c - The command to execute
   */
  public setLightTimeBased(c: RoomSetLightTimeBasedCommand): void {
    if (!this.LightGroup) {
      this.log(LogLevel.Trace, 'Ignore "setLightTimeBased" as we have no lamps');
      return;
    }

    if (c.movementDependant) {
      if (
        !this.PraesenzGroup ||
        this.PraesenzGroup.deviceCluster.getDevicesByType(DeviceClusterType.MotionDetection).length === 0
      ) {
        this.log(
          LogLevel.Trace,
          'Ignore movement dependant "setLightTimeBased" as we have no Presence Group or no sensors',
        );
        return;
      }
      if (!this.PraesenzGroup.anyPresent()) {
        this.log(LogLevel.Trace, 'Turn off lights as no-one is present.');
        this.LightGroup.switchAll(new ActuatorSetStateCommand(c, false, 'No one is present --> Turn off lights.'));
        return;
      }
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
    this.LightGroup.switchTimeConditional(
      new LightGroupSwitchTimeConditionalCommand(c, timeOfDay, `time: ${TimeOfDay[timeOfDay]}`),
    );
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

  public toJSON(): Partial<
    iRoomBase & {
      /**
       * The dictionary representation of the group map
       */
      groupDict?: { [p: string]: BaseGroup };
    }
  > {
    return Utils.jsonFilter(_.omit(this, ['_deviceCluster']));
  }

  public log(level: LogLevel, message: string): void {
    ServerLogService.writeLog(level, message, {
      room: this.roomName,
    });
  }
}
