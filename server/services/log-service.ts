import { HmIpDeviceType } from '../devices/hmIPDevices/hmIpDeviceType';
import { ZigbeeDeviceType } from '../devices/zigbee/zigbeeDeviceType';
import { TelegramService } from './Telegram/telegram-service';
import { LogLevel } from '../../models/logLevel';

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
    pDeviceType: HmIpDeviceType,
    pRoomIndex: number,
    forceDebug: boolean = false,
  ): void {
    const logLevel = forceDebug ? LogLevel.Debug : LogLevel.Trace;
    ServerLogService.writeLog(
      logLevel,
      `${HmIpDeviceType[pDeviceType]} (Raumindex: ${pRoomIndex}) zum Raum "${pRoomName}" hinzugefügt"`,
    );
  }

  public static missingRoomHandling(pRoomName: string, pDeviceType: HmIpDeviceType): void {
    ServerLogService.writeLog(
      LogLevel.Warn,
      `Raum "${pRoomName}" hat keine Definition für den Typ "${HmIpDeviceType[pDeviceType]}"`,
    );
  }

  public static missingRoomIndexHandling(pRoomName: string, pIndex: number, pDeviceType: HmIpDeviceType): void {
    ServerLogService.writeLog(
      LogLevel.Warn,
      `Raum "${pRoomName}" hat keine Definition für den Typ "${HmIpDeviceType[pDeviceType]} mit Index ${pIndex}"`,
    );
  }

  public static addedZigbeeDeviceToRoom(pRoomName: string, pDeviceType: ZigbeeDeviceType, pRoomIndex: number): void {
    ServerLogService.writeLog(
      LogLevel.Trace,
      `${ZigbeeDeviceType[pDeviceType]} (Raumindex: ${pRoomIndex}) zum Raum "${pRoomName}" hinzugefügt"`,
    );
  }

  public static missingZigbeeRoomHandling(pRoomName: string, pDeviceType: ZigbeeDeviceType): void {
    ServerLogService.writeLog(
      LogLevel.Warn,
      `Raum "${pRoomName}" hat keine Definition für den Zigbee Typ "${ZigbeeDeviceType[pDeviceType]}"`,
    );
  }

  public static missingZigbeeRoomIndexHandling(pRoomName: string, pIndex: number, pDeviceType: ZigbeeDeviceType): void {
    ServerLogService.writeLog(
      LogLevel.Warn,
      `Raum "${pRoomName}" hat keine Definition für den Typ "${ZigbeeDeviceType[pDeviceType]} mit Index ${pIndex}"`,
    );
  }
}
