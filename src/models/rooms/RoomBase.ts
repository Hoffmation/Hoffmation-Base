import { TimeCallback } from '../timeCallback';
import { TasterGroup } from '../../server/devices/groups/tasterGroup';
import { PraesenzGroup } from '../../server/devices/groups/praesenzGroup';
import { HeatGroup } from '../../server/devices/groups/heatGroup';
import { LogLevel } from '../logLevel';
import { WaterGroup } from '../../server/devices/groups/waterGroup';
import { ServerLogService } from '../../server/services/log-service';
import { LampenGroup } from '../../server/devices/groups/lampenGroup';
import { RoomSettings } from './RoomSettings/RoomSettings';
import { SmokeGroup } from '../../server/devices/groups/smokeGroup';
import { FensterGroup } from '../../server/devices/groups/fensterGroup';
import { Persist } from '../../server/services/dbo/persist';
import { TimeCallbackService, TimeOfDay } from '../../server/services/time-callback-service';
import { SonosGroup } from '../../server/devices/groups/sonosGroup';
import { iRoomBase } from './iRoomBase';
import { RoomService } from '../../server/services/room-service/room-service';

export class RoomBase implements iRoomBase {
  public etage: number | undefined;
  public FensterGroup: FensterGroup = new FensterGroup(this, []);
  public PraesenzGroup: PraesenzGroup = new PraesenzGroup(this, [], []);
  public LampenGroup: LampenGroup = new LampenGroup(this, [], [], []);
  public TasterGroup: TasterGroup = new TasterGroup(this, []);
  public SonosGroup: SonosGroup = new SonosGroup(this, []);
  public SmokeGroup: SmokeGroup = new SmokeGroup(this, []);
  public WaterGroup: WaterGroup = new WaterGroup(this, []);
  public HeatGroup: HeatGroup = new HeatGroup(this, []);
  public Settings: RoomSettings;
  public sonnenAufgangCallback: TimeCallback | undefined;
  public sonnenUntergangCallback: TimeCallback | undefined;
  public sonnenAufgangLichtCallback: TimeCallback | undefined;
  public skipNextRolloUp: boolean = false;

  public constructor(public roomName: string, public Einstellungen: RoomSettings) {
    this.etage = Einstellungen.etage;
    Einstellungen.room = this;
    this.Settings = Einstellungen;
    RoomService.addToRoomList(this);
  }

  public initializeBase(): void {
    ServerLogService.writeLog(LogLevel.Debug, `RoomBase Init für ${this.roomName}`);
    this.recalcTimeCallbacks();
    this.PraesenzGroup.initCallbacks();
    this.FensterGroup.initCallbacks();
    this.TasterGroup.initCallbacks();
  }

  public persist(): void {
    Persist.addRoom(this);
  }

  public recalcTimeCallbacks(): void {
    const now: Date = new Date();
    if (this.sonnenAufgangCallback && this.Einstellungen.rolloOffset) {
      this.sonnenAufgangCallback.minuteOffset = this.Einstellungen.rolloOffset.sunrise;
      this.sonnenAufgangCallback.sunTimeOffset = this.Einstellungen.rolloOffset;
      this.sonnenAufgangCallback.recalcNextToDo(now);
    }
    if (this.sonnenUntergangCallback && this.Einstellungen.rolloOffset) {
      this.sonnenUntergangCallback.minuteOffset = this.Einstellungen.rolloOffset.sunset;
      this.sonnenUntergangCallback.sunTimeOffset = this.Einstellungen.rolloOffset;
      this.sonnenUntergangCallback.recalcNextToDo(now);
    }
    if (this.sonnenAufgangLichtCallback && this.Einstellungen.lampOffset) {
      this.sonnenAufgangLichtCallback.minuteOffset = this.Einstellungen.lampOffset.sunrise;
      this.sonnenAufgangLichtCallback.recalcNextToDo(now);
    }
  }

  /**
   * Sets the light based on the current time, rollo Position and room Settings
   * @param movementDependant Only turn light on if there was a movement in the same room
   */
  public setLightTimeBased(movementDependant: boolean = false): void {
    if (movementDependant && !this.PraesenzGroup.anyPresent()) {
      this.LampenGroup.switchAll(false);
      return;
    }

    if (!this.Einstellungen.lampOffset) {
      ServerLogService.writeLog(
        LogLevel.Alert,
        `Beim Aufruf von "setLightTimeBased" im Raum ${this.roomName} liegt kein Lampen Offset vor`,
      );
      return;
    }
    let timeOfDay: TimeOfDay = TimeCallbackService.dayType(this.Einstellungen.lampOffset);
    if (
      timeOfDay === TimeOfDay.Daylight &&
      ((this.Einstellungen.lightIfNoWindows && this.FensterGroup.fenster.length === 0) ||
        this.FensterGroup.fenster.some((f) => {
          const rolloDown: boolean = f.rollo?.currentLevel === 0;
          ServerLogService.writeLog(
            LogLevel.Debug,
            `Rollo ${f.rollo?.info.customName} for light in ${this.roomName} is ${rolloDown ? '' : 'not '}down`,
          );
          return rolloDown;
        }))
    ) {
      timeOfDay = TimeOfDay.AfterSunset;
    }
    this.LampenGroup.switchTimeConditional(timeOfDay);
  }

  public isNowLightTime(): boolean {
    if (!this.Einstellungen.lampOffset) {
      ServerLogService.writeLog(
        LogLevel.Alert,
        `Beim Aufruf von "setLightTimeBased" im Raum ${this.roomName} liegt kein Lampen Offset vor`,
      );
      return false;
    }
    let timeOfDay: TimeOfDay = TimeCallbackService.dayType(this.Einstellungen.lampOffset);
    if (
      timeOfDay === TimeOfDay.Daylight &&
      this.FensterGroup.fenster.some((f) => {
        return f.rollo?.currentLevel === 0;
      })
    ) {
      timeOfDay = TimeOfDay.AfterSunset;
    }
    return TimeCallbackService.darkOutsideOrNight(timeOfDay);
  }
}
