import { ringStorage } from '../utils/ringstorage';
import { RoomBase } from '../../../models/rooms/RoomBase';
import { ServerLogService } from '../log-service';
import { LogLevel } from '../../../models/logLevel';
import { SonosService } from '../Sonos/sonos-service';
import { Res } from '../Translation/res';
import { Utils } from '../utils/utils';
import { TelegramService } from '../Telegram/telegram-service';
import { iRoomBase } from '../../../models/rooms/iRoomBase';
import { IoBrokerBaseDevice } from '../../devices/IoBrokerBaseDevice';

export class RoomService {
  public static Rooms: Map<string, RoomBase> = new Map<string, RoomBase>();
  public static awayModeActive: boolean = false;
  public static nightAlarmActive: boolean = false;
  public static movementHistory: ringStorage = new ringStorage(15);
  private static _awayModeTimeout: NodeJS.Timeout | undefined;
  private static _nightModeTimeout: NodeJS.Timeout | undefined;
  private static _intrusionAlarmActive: boolean = false;
  private static _intrusionAlarmLevel: number = 0;
  private static _intrusionAlarmTimeout: NodeJS.Timeout | undefined;

  public static addToRoomList(room: RoomBase): void {
    RoomService.Rooms.set(room.roomName, room);
  }

  public static getAllRoomsOfFloor(floor: number): IterableIterator<[string, RoomBase]> {
    return [...this.Rooms].filter(([_name, room]) => room.etage === floor).values();
  }

  /**
   * Set ALl Roolos of a specific floor
   * !!floor -1 sets all rollos in house instead!!
   * @param floor the level on which all rollos shall be changed -1 equals all rooms
   * @param position (0 equals down, 100 up)
   */
  public static setAllRolloOfFloor(floor: number = -1, position: number = 0): void {
    const rooms: IterableIterator<[string, RoomBase]> =
      floor > -1 ? this.getAllRoomsOfFloor(floor) : this.Rooms.entries();
    for (const [_name, room] of rooms) {
      room.FensterGroup?.allRolloToLevel(position, true);
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
    const rooms: IterableIterator<[string, RoomBase]> =
      floor > -1 ? this.getAllRoomsOfFloor(floor) : this.Rooms.entries();
    for (const [_name, room] of rooms) {
      room.LampenGroup?.setAllLampen(status, -1, true);
      room.LampenGroup?.setAllLED(status);
      room.LampenGroup?.setAllStecker(status, -1, true);
    }
  }

  public static clearAllAlarms(): void {
    for (const r of RoomService.Rooms.values()) {
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
    SonosService.speakOnAll(Res.alarmArmed(), 40);
    if (this._awayModeTimeout) {
      clearTimeout(this._awayModeTimeout);
    }
    this._awayModeTimeout = Utils.guardedTimeout(
      () => {
        this.awayModeActive = true;
        this._awayModeTimeout = undefined;
        TelegramService.inform(`Alarm ist nun scharf. Gute Reise!`);
      },
      60000,
      this,
    );
  }

  public static startNightAlarmMode(): void {
    SonosService.speakOnAll(Res.alarmNightModeArmed(), 30);
    if (this._nightModeTimeout) {
      clearTimeout(this._nightModeTimeout);
    }
    this._nightModeTimeout = Utils.guardedTimeout(
      () => {
        this.nightAlarmActive = true;
        this._nightModeTimeout = undefined;
        TelegramService.inform(`Alarm ist nun scharf. Süße Träume!`);
      },
      60000,
      this,
    );
  }

  public static startIntrusionAlarm(room: iRoomBase, device: IoBrokerBaseDevice): void {
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
      SonosService.speakOnAll(Res.welcomeHome(), 35);
    }
    if (this.nightAlarmActive) {
      TelegramService.sendMessage(TelegramService.subscribedIDs, `Nachtmodus der Alarmanlage entschärft`);
      SonosService.speakOnAll(Res.goodMorning(), 30);
    }
    if (this._nightModeTimeout) {
      clearTimeout(this._nightModeTimeout);
    }
    if (this._awayModeTimeout) {
      clearTimeout(this._awayModeTimeout);
    }
    this.awayModeActive = false;
    this.nightAlarmActive = false;

    this.stopIntrusionAlarm();
  }

  public static getLastMovements(): string {
    return this.movementHistory.readAmount(15).join('\n');
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
      speakMessage = Res.intruderGreeting();
      volume = 40;
    } else if (this._intrusionAlarmLevel === 2) {
      speakMessage = Res.intruderShutterUpPleaseLeave();
      Utils.guardedNewThread(() => {
        this.setAllRolloOfFloor(-1, 100);
        this.setAllLampsOfFloor(-1, true);
      }, this);
    } else if (this._intrusionAlarmLevel === 3) {
      volume = 70;
      speakMessage = Res.intruderLeaveAndOwnerInformed();
    } else if (this._intrusionAlarmLevel <= 5) {
      volume = 80;
      speakMessage = Res.intruderAdditionalDefenseWarning();
    } else if (this._intrusionAlarmLevel >= alarmAutomaticEnd) {
      this.stopIntrusionAlarm();
      return;
    } else {
      volume = 90;
      speakMessage = Res.intruderAlarm();
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
    for (const room of this.Rooms.values()) {
      room.FensterGroup?.restoreRolloPosition();
    }
  }

  private static restoreLight() {
    for (const room of this.Rooms.values()) {
      room.setLightTimeBased(true);
    }
  }
}
