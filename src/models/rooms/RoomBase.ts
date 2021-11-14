import { ringStorage } from '../../server/services/utils/ringstorage';
import { TimeCallback } from '../timeCallback';
import { TasterGroup } from '../../server/devices/groups/tasterGroup';
import { PraesenzGroup } from '../../server/devices/groups/praesenzGroup';
import { TelegramService } from '../../server/services/Telegram/telegram-service';
import { HeatGroup } from '../../server/devices/groups/heatGroup';
import { LogLevel } from '../logLevel';
import { WaterGroup } from '../../server/devices/groups/waterGroup';
import { IoBrokerBaseDevice } from '../../server/devices/IoBrokerBaseDevice';
import { ServerLogService } from '../../server/services/log-service';
import { Utils } from '../../server/services/utils/utils';
import { LampenGroup } from '../../server/devices/groups/lampenGroup';
import { RoomSettings } from './RoomSettings/RoomSettings';
import { SmokeGroup } from '../../server/devices/groups/smokeGroup';
import { FensterGroup } from '../../server/devices/groups/fensterGroup';
import { Persist } from '../../server/services/dbo/persist';
import { TimeCallbackService, TimeOfDay } from '../../server/services/time-callback-service';
import { SonosService } from '../../server/services/Sonos/sonos-service';
import { SonosGroup } from '../../server/devices/groups/sonosGroup';

export class RoomBase {
  public static Rooms: { [name: string]: RoomBase } = {};
  public static allRooms: RoomBase[] = [];
  public static floors: { [level: number]: RoomBase[] } = {};
  public static awayModeActive: boolean = false;
  public static nightAlarmActive: boolean = false;
  public static movementHistory: ringStorage = new ringStorage(15);
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
  private static _awayModeTimer: NodeJS.Timeout | undefined;
  private static _nightModeTimer: NodeJS.Timeout | undefined;
  private static _intrusionAlarmActive: boolean = false;
  private static _intrusionAlarmLevel: number = 0;
  private static _intrusionAlarmTimeout: NodeJS.Timeout | undefined;

  public static addToRoomList(room: RoomBase): void {
    RoomBase.Rooms[room.roomName] = room;
  }

  public static getAllRoomsOfFloor(floor: number): Array<RoomBase> {
    return this.floors[floor];
  }

  /**
   * Set ALl Roolos of a specific floor
   * !!floor -1 sets all rollos in house instead!!
   * @param floor the level on which all rollos shall be changed -1 equals all rooms
   * @param position (0 equals down, 100 up)
   */
  public static setAllRolloOfFloor(floor: number = -1, position: number = 0): void {
    const rooms: RoomBase[] = floor > -1 ? this.getAllRoomsOfFloor(floor) : this.allRooms;
    for (const room of rooms) {
      room.FensterGroup.allRolloToLevel(position, true);
    }
  }

  /**
   * Set ALl Lamps of a specific floor
   * !!floor -1 sets all lamps in house instead!!
   * @param floor the level on which all lamps shall be changed -1 equals all rooms
   * @param status
   */
  public static setAllLampsOfFloor(floor: number, status: boolean = false): void {
    ServerLogService.writeLog(LogLevel.Info, `Schalte alle Lampen in Etage ${floor} auf den Wert ${status}`);
    const rooms: RoomBase[] = floor > -1 ? this.getAllRoomsOfFloor(floor) : this.allRooms;
    for (const room of rooms) {
      room.LampenGroup.setAllLampen(status, -1, true);
      room.LampenGroup.setAllLED(status);
      room.LampenGroup.setAllStecker(status, -1, true);
    }
  }

  public static clearAllAlarms(): void {
    for (const r of RoomBase.allRooms) {
      if (r.WaterGroup) {
        r.WaterGroup.stopAlarm();
      }
      if (r.SmokeGroup) {
        r.SmokeGroup.stopAlarm();
      }
    }
    this.stopIntrusionAlarm();
    this.restoreRolloPosition();
    this.restoreLight();
  }

  public static startAwayMode(): void {
    SonosService.speakOnAll(`Alarmanlage wird scharfgeschaltet.`, 40);
    if (this._awayModeTimer) {
      clearTimeout(this._awayModeTimer);
    }
    this._awayModeTimer = Utils.guardedTimeout(
      () => {
        this.awayModeActive = true;
        this._awayModeTimer = undefined;
        TelegramService.inform(`Alarm ist nun scharf. Gute Reise!`);
      },
      60000,
      this,
    );
  }
  public static startNightAlarmMode(): void {
    SonosService.speakOnAll(`Alarmanlage wird für die Nacht scharfgeschaltet. Gute Nacht!`, 30);
    if (this._nightModeTimer) {
      clearTimeout(this._nightModeTimer);
    }
    this._nightModeTimer = Utils.guardedTimeout(
      () => {
        this.nightAlarmActive = true;
        this._nightModeTimer = undefined;
        TelegramService.inform(`Alarm ist nun scharf. Süße Träume!`);
      },
      60000,
      this,
    );
  }

  public static startIntrusionAlarm(room: RoomBase, device: IoBrokerBaseDevice): void {
    const message: string = `!Potenzieller Eindringling! Bewegung in ${room.roomName} von ${device.info.fullName} festgestellt`;
    ServerLogService.writeLog(LogLevel.Info, message);
    if (!this.awayModeActive && !this.nightAlarmActive) {
      this.stopIntrusionAlarm();
      return;
    }

    Utils.guardedNewThread(() => {
      TelegramService.inform(message);
    }, this);

    if (this._intrusionAlarmActive) {
      return;
    }
    this._intrusionAlarmActive = true;
    this.performNextIntrusionLevel();
  }

  public static endAlarmModes(): void {
    if (this.awayModeActive) {
      TelegramService.sendMessage(TelegramService.subscribedIDs, `Alarmanalage entschärft`);
      SonosService.speakOnAll(`Willkommen Zuhause!`, 35);
    }
    if (this.nightAlarmActive) {
      TelegramService.sendMessage(TelegramService.subscribedIDs, `Nachtmodus der Alarmanlage entschärft`);
      SonosService.speakOnAll(`Guten Morgen!`, 30);
    }
    if (this._nightModeTimer) {
      clearTimeout(this._nightModeTimer);
    }
    if (this._awayModeTimer) {
      clearTimeout(this._awayModeTimer);
    }
    this.awayModeActive = false;
    this.nightAlarmActive = false;

    this.stopIntrusionAlarm();
  }

  public static getLastMovements(): string {
    return this.movementHistory.readAmount(15).join('\n');
  }

  public constructor(public roomName: string, public Einstellungen: RoomSettings) {
    if (Einstellungen.etage !== undefined) {
      const level: number = Einstellungen.etage;
      if (RoomBase.floors[level] === undefined) {
        RoomBase.floors[level] = [];
      }
      RoomBase.floors[level].push(this);
    }
    Einstellungen.room = this;
    this.Settings = Einstellungen;
    RoomBase.allRooms.push(this);
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

  private static stopIntrusionAlarm() {
    ServerLogService.writeLog(LogLevel.Info, `Stoppe Intrusion Alarm`);
    if (this._intrusionAlarmTimeout) {
      clearTimeout(this._intrusionAlarmTimeout);
    }
    if (!this._intrusionAlarmActive) {
      return;
    }
    this._intrusionAlarmActive = false;
    this._intrusionAlarmLevel = 0;
    ServerLogService.writeLog(LogLevel.Alert, `Alarm wurde beendet --> Fahre Rollos in Ausgangsposition.`);
    this.restoreRolloPosition();
    this.restoreLight();
  }

  private static performNextIntrusionLevel(): void {
    this._intrusionAlarmTimeout = undefined;
    if (!this.awayModeActive && !this._intrusionAlarmActive) {
      return;
    }
    this._intrusionAlarmLevel += 1;
    let speakMessage: string;
    let volume = 50;
    let newTimeout: number = 20000;
    const alarmAutomaticEnd: number = 15;
    if (this._intrusionAlarmLevel === 1) {
      speakMessage = `Hallo potenzieller Eindringling! Das Alarmprotokoll ist initiiert bitte verlassen Sie umgehend das Gebäude!`;
      volume = 40;
    } else if (this._intrusionAlarmLevel === 2) {
      speakMessage = `Alle Rollos fahren hoch, bitte begeben Sie sich zum nächsten Ausgang`;
      Utils.guardedNewThread(() => {
        this.setAllRolloOfFloor(-1, 100);
        this.setAllLampsOfFloor(-1, true);
      }, this);
    } else if (this._intrusionAlarmLevel === 3) {
      volume = 70;
      speakMessage = `Verlassen Sie sofort das Gebäude! Die Behörden sind informiert`;
    } else if (this._intrusionAlarmLevel <= 5) {
      volume = 80;
      speakMessage = `Weitere Abwehrmaßnahmen werden eingeleitet`;
    } else if (this._intrusionAlarmLevel >= alarmAutomaticEnd) {
      this.stopIntrusionAlarm();
      return;
    } else {
      volume = 90;
      speakMessage = `Alarm. Einbrecher erkannt.`;
      newTimeout = 10000;
    }
    this._intrusionAlarmTimeout = Utils.guardedTimeout(
      () => {
        this.performNextIntrusionLevel();
      },
      newTimeout,
      this,
    );
    Utils.guardedNewThread(() => {
      SonosService.speakOnAll(speakMessage, volume);
      TelegramService.inform(
        `Eindringling erhielt folgende Nachricht: "${speakMessage}"\nAlarmlevel ist ${this._intrusionAlarmLevel}\t Automatisches Ende bei ${alarmAutomaticEnd}`,
      );
    }, this);
  }

  private static restoreRolloPosition(): void {
    const rooms: RoomBase[] = this.allRooms;
    for (const room of rooms) {
      room.FensterGroup.restoreRolloPosition();
    }
  }

  private static restoreLight() {
    const rooms: RoomBase[] = this.allRooms;
    for (const room of rooms) {
      room.setLightTimeBased(true);
    }
  }
}
