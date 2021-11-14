import { DeviceType } from 'index';
import { TelegramService } from 'index';
import { LogLevel } from 'index';

export class ServerLogService {
  public static logLevel: number = 4;
  public static telegramLevel: number = -1; // Controlled from within Config File
  public static writeLog(pLevel: LogLevel, pMessage: string): void {
    if (pLevel > ServerLogService.logLevel) {
      return;
    }

    console.log(pMessage);

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
