import { iBaseDevice, iDeviceInfo, iDeviceSettings, iPersist } from '../interfaces';
import { DeviceCapability, DeviceType, LogDebugType, LogLevel } from '../enums';
import { RingStorage, Utils } from '../utils';
import { ServerLogService } from '../logging';
import { Persistence } from '../services';
import { RoomBaseDevice } from './RoomBaseDevice';
import { iBaseCommand } from '../command';
import _ from 'lodash';

export abstract class BaseDevice implements iBaseDevice {
  /** @inheritDoc */
  public readonly jsonOmitKeys: string[] = [];
  /** @inheritDoc */
  public readonly jsonOmitTopLevelKeys: string[] = [];
  /** @inheritDoc */
  public readonly deviceCapabilities: DeviceCapability[] = [];
  /**
   * @inheritDoc
   * @default undefined (no Settings)
   */
  public settings: iDeviceSettings | undefined = undefined;
  /**
   * The last actions this device performed
   */
  public lastCommands: RingStorage<iBaseCommand> = new RingStorage<iBaseCommand>(10);
  protected _lastWrite: number = 0;

  protected constructor(
    protected _info: iDeviceInfo,
    public deviceType: DeviceType,
  ) {
    Utils.guardedTimeout(this.loadDeviceSettings, 300, this);
    this.persistDeviceInfo();
  }

  /**
   * Getter info
   * @returns The device info
   */
  public get info(): iDeviceInfo {
    return this._info;
  }

  /** @inheritDoc */
  public get customName(): string {
    return this.info.customName;
  }

  /** @inheritDoc */
  public get id(): string {
    const result: string = Utils.guard(this.info.allDevicesKey);
    if (result === '0' || result === '1') {
      ServerLogService.writeLog(
        LogLevel.Warn,
        `Device "${this.info.fullName}" has an akward allDevicesKey of "${result}"`,
      );
    }
    return result;
  }

  protected get dbo(): iPersist | undefined {
    return Persistence.dbo;
  }

  protected get anyDboActive(): boolean {
    return Persistence.anyDboActive;
  }

  /** @inheritDoc */
  public loadDeviceSettings(): void {
    Utils.retryAction(
      (): boolean => {
        if (this.settings === undefined || !Persistence.dboReady) {
          return false;
        }
        this.settings?.initializeFromDb(this);
        return true;
      },
      this,
      5,
      2000,
      undefined,
      () => {
        this.log(LogLevel.Error, 'Could not load device settings within 5 retries.');
      },
    );
  }

  public log(level: LogLevel, message: string, logDebugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, message, {
      room: this.info.room,
      deviceId: this.id,
      deviceName: this.info.customName,
      debugType: logDebugType,
    });
  }

  public logCommand(
    c: iBaseCommand,
    ignoreReason?: string,
    logDebugType?: LogDebugType,
    level: LogLevel = LogLevel.Info,
  ): void {
    if (ignoreReason) {
      c.ignoreReason = ignoreReason;
    }
    this.lastCommands.add(c);
    this.log(level, c.logMessage, logDebugType);
  }

  /** @inheritDoc */
  public persistDeviceInfo(): void {
    Utils.guardedTimeout(
      () => {
        Persistence.dbo?.addDevice(this);
      },
      5000,
      this,
    );
  }

  /** @inheritDoc */
  public toJSON(): Partial<RoomBaseDevice> {
    // eslint-disable-next-line
    const returnValue: any = _.omit(this, 'lastCommands');
    returnValue['lastCommands'] = this.lastCommands.readAmount(this.lastCommands.maximumSize);
    return Utils.jsonFilter(returnValue, this.jsonOmitKeys, this.jsonOmitTopLevelKeys);
  }
}
