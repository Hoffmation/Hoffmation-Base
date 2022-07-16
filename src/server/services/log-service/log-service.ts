import { TelegramService } from '../Telegram';
import { LogLevel } from '../../../models';
import { DeviceType } from '../../devices';
import { iLogSettings } from '../../config';
import { ringStorage } from '../utils';
import { LogObject } from './log-object';
import { LogDebugType, LogFilterData } from './log-filter-data';
import { LogSource } from '../../../models/logSource';
import { SettingsService } from '../settings-service';

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
    if (
      additionalLogInfo &&
      additionalLogInfo.debugType !== LogDebugType.None &&
      ServerLogService.checkDebugLogSkip(additionalLogInfo.debugType)
    ) {
      return;
    }
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

  /**
   * Checks if this message is of a debugtype which should be skipped according to settings
   * @param {LogDebugType} debugType
   * @returns {boolean} If the Message should be skipped
   */
  private static checkDebugLogSkip(debugType: LogDebugType): boolean {
    switch (debugType) {
      case LogDebugType.None:
        break;
      case LogDebugType.SkipUnchangedActuatorCommand:
        if (SettingsService.settings.logSettings?.debugUnchangedActuator === true) {
          return false;
        }
        break;
      case LogDebugType.SkipUnchangedRolloPosition:
        if (SettingsService.settings.logSettings?.debugUchangedShutterPosition === true) {
          return false;
        }
        break;
      case LogDebugType.SetActuator:
        if (SettingsService.settings.logSettings?.debugActuatorChange === true) {
          return false;
        }
        break;
      case LogDebugType.ShutterPositionChange:
        if (SettingsService.settings.logSettings?.debugShutterPositionChange === true) {
          return false;
        }
        break;
      case LogDebugType.NewMovementState:
        if (SettingsService.settings.logSettings?.debugNewMovementState === true) {
          return false;
        }
        break;
      case LogDebugType.SkipUnchangedMovementState:
        break;
    }
    return true;
  }
}
