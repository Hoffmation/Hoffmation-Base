import { TelegramService } from './Telegram/telegram-service';
import { LogLevel } from '../../models/logLevel';
import { DeviceType } from '../devices/deviceType';
import { iLogSettings } from '../config/iConfig';

export class ServerLogService {
  public static telegramLevel: number = -1; // Controlled from within Config File
  public static settings: iLogSettings = {
    logLevel: 4,
    useTimestamp: false,
  };

  public static initialize(logSettings: iLogSettings): void {
    this.settings = logSettings;
  }

  public static writeLog(pLevel: LogLevel, pMessage: string): void {
    if (pLevel > ServerLogService.settings.logLevel) {
      return;
    }

    console.log((this.settings.useTimestamp ? `[${Date.now()}] ` : '') + pMessage);

    if (pLevel <= ServerLogService.telegramLevel) {
      const title: string = LogLevel[pLevel];
      TelegramService.sendMessage(TelegramService.subscribedIDs, `${title}: ${pMessage}`);
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
