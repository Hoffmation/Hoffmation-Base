import { TelegramService } from '../Telegram/telegram-service';
import { LogLevel } from '../../../models/logLevel';
import { DeviceType } from '../../devices/deviceType';
import { iLogSettings } from '../../config/iConfig';
import { ringStorage } from '../utils/ringstorage';
import { LogObject } from './log-object';
import { LogFilterData } from './log-filter-data';
import { LogSource } from '../../../models/logSource';

export class ServerLogService {
  public static telegramLevel: number = -1; // Controlled from within Config File
  public static storageLevel: number = 5; // Controlled from within Config File
  public static storage: ringStorage<LogObject> = new ringStorage<LogObject>(10000);
  public static settings: iLogSettings = {
    logLevel: 4,
    useTimestamp: false,
  };

  public static getLog(amount: number = 5000): LogObject[] {
    return this.storage.readAmount(amount);
  }

  public static initialize(logSettings: iLogSettings): void {
    this.settings = logSettings;
  }

  public static writeLog(pLevel: LogLevel, pMessage: string, additionalLogInfo?: LogFilterData): void {
    const now: number = Date.now();
    if (pLevel > this.storageLevel && pLevel > ServerLogService.settings.logLevel) {
      return;
    }
    if (pLevel <= this.storageLevel) {
      this.storage.add(new LogObject(now, pLevel, pMessage, additionalLogInfo));
    }
    if (pLevel <= ServerLogService.settings.logLevel) {
      let message: string = this.settings.useTimestamp ? `[${now}] ` : '';
      if (additionalLogInfo?.deviceName) {
        message += `"${additionalLogInfo.deviceName}": `;
      } else if (additionalLogInfo?.room) {
        message += `"${additionalLogInfo.room}": `;
      }
      const logSource: LogSource = additionalLogInfo?.source ?? 0;
      if (logSource > 0) {
        message += `${LogSource[logSource]}: `;
      }

      message += pMessage;
      console.log(message);

      if (pLevel <= ServerLogService.telegramLevel) {
        const title: string = LogLevel[pLevel];
        TelegramService.sendMessage(TelegramService.subscribedIDs, `${title}: ${message}`);
      }
    }
  }

  public static addedDeviceToRoom(
    pRoomName: string,
    pDeviceType: DeviceType,
    pRoomIndex: number,
    forceDebug: boolean = false,
  ): void {
    const logLevel = forceDebug ? LogLevel.Debug : LogLevel.Trace;
    ServerLogService.writeLog(
      logLevel,
      `${DeviceType[pDeviceType]} (Raumindex: ${pRoomIndex}) zum Raum "${pRoomName}" hinzugefügt"`,
    );
  }

  public static missingRoomHandling(pRoomName: string, pDeviceType: DeviceType): void {
    ServerLogService.writeLog(
      LogLevel.Warn,
      `Raum "${pRoomName}" hat keine Definition für den Typ "${DeviceType[pDeviceType]}"`,
    );
  }

  public static missingRoomIndexHandling(pRoomName: string, pIndex: number, pDeviceType: DeviceType): void {
    ServerLogService.writeLog(
      LogLevel.Warn,
      `Raum "${pRoomName}" hat keine Definition für den Typ "${DeviceType[pDeviceType]} mit Index ${pIndex}"`,
    );
  }
}
