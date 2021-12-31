import { TimeCallback } from '../timeCallback';
import { TasterGroup } from '../../server/devices/groups/tasterGroup';
import { PraesenzGroup } from '../../server/devices/groups/praesenzGroup';
import { HeatGroup } from '../../server/devices/groups/heatGroup';
import { LogLevel } from '../logLevel';
import { WaterGroup } from '../../server/devices/groups/waterGroup';
import { ServerLogService } from '../../server/services/log-service/log-service';
import { LampenGroup } from '../../server/devices/groups/lampenGroup';
import { RoomSettings } from './RoomSettings/RoomSettings';
import { SmokeGroup } from '../../server/devices/groups/smokeGroup';
import { FensterGroup } from '../../server/devices/groups/fensterGroup';
import { Persist } from '../../server/services/dbo/persist';
import { TimeCallbackService, TimeOfDay } from '../../server/services/time-callback-service';
import { SonosGroup } from '../../server/devices/groups/sonosGroup';
import { iRoomBase } from './iRoomBase';
import { RoomService } from '../../server/services/room-service/room-service';
import { RoomInfo } from './roomInfo';
import { BaseGroup } from '../../server/devices/groups/base-group';
import { GroupType } from '../../server/devices/groups/group-type';
import { ShutterService } from '../../server/services/ShutterService';
import { Utils } from '../../server/services/utils/utils';
import _ from 'lodash';

export class RoomBase implements iRoomBase {
  public info: RoomInfo;

  public get FensterGroup(): FensterGroup | undefined {
    return this.groups.get(GroupType.Window) as FensterGroup | undefined;
  }

  public get PraesenzGroup(): PraesenzGroup | undefined {
    return this.groups.get(GroupType.Presence) as PraesenzGroup | undefined;
  }

  public get LampenGroup(): LampenGroup | undefined {
    return this.groups.get(GroupType.Light) as LampenGroup | undefined;
  }

  public get TasterGroup(): TasterGroup | undefined {
    return this.groups.get(GroupType.Buttons) as TasterGroup | undefined;
  }

  public get SonosGroup(): SonosGroup | undefined {
    return this.groups.get(GroupType.Speaker) as SonosGroup | undefined;
  }

  public get SmokeGroup(): SmokeGroup | undefined {
    return this.groups.get(GroupType.Smoke) as SmokeGroup | undefined;
  }

  public get WaterGroup(): WaterGroup | undefined {
    return this.groups.get(GroupType.Water) as WaterGroup | undefined;
  }

  public get HeatGroup(): HeatGroup | undefined {
    return this.groups.get(GroupType.Heating) as HeatGroup | undefined;
  }

  public sonnenAufgangCallback: TimeCallback | undefined;
  public sonnenUntergangCallback: TimeCallback | undefined;
  public sonnenAufgangLichtCallback: TimeCallback | undefined;
  public skipNextRolloUp: boolean = false;

  public get roomName(): string {
    return this.info.roomName;
  }

  public get etage(): number | undefined {
    return this.info.etage;
  }

  public constructor(roomName: string, public settings: RoomSettings, public groups: Map<GroupType, BaseGroup>) {
    this.info = new RoomInfo(roomName, settings);
    settings.roomName = roomName;
    this.settings = settings;
    RoomService.addToRoomList(this);
  }

  public initializeBase(): void {
    this.log(LogLevel.Debug, `RoomBase Init für ${this.roomName}`);
    this.recalcTimeCallbacks();
    this.PraesenzGroup?.initCallbacks();
    this.FensterGroup?.initialize();
    this.TasterGroup?.initCallbacks();
  }

  public persist(): void {
    Persist.addRoom(this);
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
      this.sonnenUntergangCallback.recalcNextToDo(now);
    }
    if (this.sonnenAufgangLichtCallback && this.settings.lampOffset) {
      this.sonnenAufgangLichtCallback.minuteOffset = this.settings.lampOffset.sunrise;
      this.sonnenAufgangLichtCallback.recalcNextToDo(now);
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
      this.log(LogLevel.Trace, 'Turn off lights as noone is present.');
      this.LampenGroup.switchAll(false);
      return;
    }

    if (!this.settings.lampOffset) {
      this.log(
        LogLevel.Alert,
        `Beim Aufruf von "setLightTimeBased" im Raum ${this.roomName} liegt kein Lampen Offset vor`,
      );
      return;
    }
    let timeOfDay: TimeOfDay = TimeCallbackService.dayType(this.settings.lampOffset);
    if (
      timeOfDay === TimeOfDay.Daylight &&
      ((this.settings.lightIfNoWindows && (!this.FensterGroup || this.FensterGroup.fenster.length === 0)) ||
        this.FensterGroup?.fenster.some((f) => {
          return ShutterService.anyRolloDown(f.getShutter());
        }))
    ) {
      timeOfDay = TimeOfDay.AfterSunset;
    }
    this.LampenGroup.switchTimeConditional(timeOfDay);
  }

  public isNowLightTime(): boolean {
    if (!this.settings.lampOffset) {
      this.log(
        LogLevel.Alert,
        `Beim Aufruf von "setLightTimeBased" im Raum ${this.roomName} liegt kein Lampen Offset vor`,
      );
      return false;
    }
    let timeOfDay: TimeOfDay = TimeCallbackService.dayType(this.settings.lampOffset);
    if (
      timeOfDay === TimeOfDay.Daylight &&
      this.FensterGroup?.fenster.some((f) => {
        return ShutterService.anyRolloDown(f.getShutter());
      })
    ) {
      timeOfDay = TimeOfDay.AfterSunset;
    }
    return TimeCallbackService.darkOutsideOrNight(timeOfDay);
  }

  public toJSON(): Partial<RoomBase & { groupDict?: { [p: string]: BaseGroup } }> {
    const result: Partial<RoomBase & { groupDict?: { [p: string]: BaseGroup } }> = Utils.jsonFilter(this);
    result.groupDict = Object.fromEntries(this.groups);
    return _.omit(result, 'groups');
  }

  private log(level: LogLevel, message: string): void {
    ServerLogService.writeLog(level, message, {
      room: this.roomName,
    });
  }
}
