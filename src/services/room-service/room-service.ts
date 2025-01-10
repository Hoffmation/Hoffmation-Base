import { LogLevel, ServerLogService } from '../../logging';
import { SonosService } from '../Sonos';
import { Res } from '../Translation';
import { TelegramService } from '../Telegram';
import { BaseGroup, iRoomDevice } from '../../devices';
import { RoomBase } from '../RoomBase';
import { RingStorage } from '../../utils/ringStorage';
import { Utils } from '../../utils/utils';
import {
  ActuatorSetStateCommand,
  CommandSource,
  FloorSetAllShuttersCommand,
  LedSetLightCommand,
  RoomRestoreLightCommand,
  RoomRestoreShutterPositionCommand,
  RoomSetLightTimeBasedCommand,
  WindowSetDesiredPositionCommand,
  WledSetLightCommand,
} from '../../models/command';
import { iRoomBase } from '../../models/rooms';

export class RoomService {
  /**
   * A Map containing all rooms in the house identified by their name
   */
  public static Rooms: Map<string, RoomBase> = new Map<string, RoomBase>();
  /**
   * A Map containing all groups in the house identified by {@link BaseGroup.id}
   */
  public static Groups: Map<string, BaseGroup> = new Map<string, BaseGroup>();
  /**
   * A boolean indicating if the away mode is active, which triggers certain alarms on movement
   */
  public static awayModeActive: boolean = false;
  /**
   * A boolean indicating if the night mode is active, which triggers certain alarms on movement in rooms included in night alarm
   */
  public static nightAlarmActive: boolean = false;
  /**
   * A ring storage containing the last 15 detected movements in the house
   */
  public static movementHistory: RingStorage<string> = new RingStorage<string>(15);
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
   * Moves all shutters of the desired floor(s) to the desired position
   * @param c - the command to be executed on all windows of the desired floor(s)
   */
  public static setAllShutterOfFloor(c: FloorSetAllShuttersCommand): void {
    const rooms: IterableIterator<[string, RoomBase]> =
      c.specificFloor != undefined ? this.getAllRoomsOfFloor(c.specificFloor) : this.Rooms.entries();
    for (const [_name, room] of rooms) {
      room.WindowGroup?.setDesiredPosition(new WindowSetDesiredPositionCommand(c, c.position));
    }
  }

  /**
   * Set ALl Lamps of a specific floor
   * !!floor -1 sets all lamps in house instead!!
   * @param floor - {number} the level on which all lamps shall be changed -1 equals all rooms
   * @param command - {ActuatorSetStateCommand} the command to be executed
   */
  public static setAllLampsOfFloor(floor: number, command: ActuatorSetStateCommand): void {
    ServerLogService.writeLog(LogLevel.Info, `Schalte alle Lampen in Etage ${floor} auf den Wert ${command.on}`);
    const rooms: IterableIterator<[string, RoomBase]> =
      floor > -1 ? this.getAllRoomsOfFloor(floor) : this.Rooms.entries();
    for (const [_name, room] of rooms) {
      room.LightGroup?.setAllLampen(command);
      room.LightGroup?.setAllLED(new LedSetLightCommand(command, command.on));
      room.LightGroup?.setAllOutlets(command);
      room.LightGroup?.setAllWled(new WledSetLightCommand(command, command.on));
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
        TelegramService.inform('Alarm ist nun scharf. Gute Reise!');
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
        TelegramService.inform('Alarm ist nun scharf. Süße Träume!');
      },
      60000,
      this,
    );
  }

  public static startIntrusionAlarm(room: iRoomBase, device: iRoomDevice): void {
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
      TelegramService.sendMessageToSubscriber('Alarm Mode disarmed');
      SonosService.speakOnAll(Res.welcomeHome(), 35);
    }
    if (this.nightAlarmActive) {
      TelegramService.sendMessageToSubscriber('Nachtmodus der Alarmanlage entschärft');
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
    ServerLogService.writeLog(LogLevel.Info, 'Stoppe Intrusion Alarm');
    if (this._intrusionAlarmTimeout) {
      clearTimeout(this._intrusionAlarmTimeout);
    }
    if (!this._intrusionAlarmActive) {
      return;
    }
    this._intrusionAlarmActive = false;
    this._intrusionAlarmLevel = 0;
    ServerLogService.writeLog(LogLevel.Alert, 'Alarm wurde beendet --> Fahre Rollos in Ausgangsposition.');
    this.restoreShutterPositions(
      new RoomRestoreShutterPositionCommand(
        CommandSource.Force,
        false,
        'Resetting all shutter in all Rooms to last known position',
      ),
    );
    this.restoreLight(new RoomRestoreLightCommand(CommandSource.Force, 'roomService.clearAllAlarms'));
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
        this.setAllShutterOfFloor(
          new FloorSetAllShuttersCommand(CommandSource.Automatic, 100, undefined, 'Intrusion alarm level 2'),
        );
        this.setAllLampsOfFloor(
          -1,
          new ActuatorSetStateCommand(CommandSource.Automatic, true, 'Intrusion alarm level 2'),
        );
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

  private static restoreShutterPositions(c: RoomRestoreShutterPositionCommand): void {
    for (const room of this.Rooms.values()) {
      room.WindowGroup?.restoreShutterPosition(c);
    }
  }

  private static restoreLight(c: RoomRestoreLightCommand) {
    for (const room of this.Rooms.values()) {
      room.setLightTimeBased(new RoomSetLightTimeBasedCommand(c, true, 'roomService.restoreLight'));
    }
  }
}
