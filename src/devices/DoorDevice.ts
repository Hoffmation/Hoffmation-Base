import { DeviceCapability, DeviceType, LogDebugType, LogLevel } from '../enums';
import { DeviceInfo } from './DeviceInfo';
import { Devices } from './devices';
import { Utils } from '../utils';
import { ServerLogService } from '../logging';
import { RoomBaseDevice } from './RoomBaseDevice';
import { iDoorDevice, iDoorSettings } from '../interfaces';
import { DoorSettings } from '../settingsObjects/deviceSettings/doorSettings';
import { TelegramService } from '../services';
import { DingSensorAction } from '../action';

export abstract class DoorDevice extends RoomBaseDevice implements iDoorDevice {
  /** @inheritDoc */
  public settings: iDoorSettings = new DoorSettings();
  /**
   * The human readable name of this device
   */
  public readonly name: string;
  /** @inheritDoc */
  public dingsToday: number = 0;
  protected _lastDing: number = 0;
  protected _dingCallback: Array<(action: DingSensorAction) => void> = [];
  protected _dingActive: boolean = false;
  protected _lastUpdate: Date = new Date(0);
  private _dingActiveFallbackTimeout: NodeJS.Timeout | null = null;

  protected constructor(name: string, roomName: string) {
    const info = new DeviceInfo();
    info.fullName = `Door ${roomName} ${name}`;
    info.customName = `Door ${name}`;
    info.room = roomName;
    const allDevicesKey = `door-${roomName}-${name}`;
    info.allDevicesKey = allDevicesKey;
    super(info, DeviceType.Door);
    // this.jsonOmitKeys.push('_lastImage');
    this.deviceCapabilities.push(DeviceCapability.doorbell);
    this.name = name;
    Devices.alLDevices[allDevicesKey] = this;
  }

  public get lastUpdate(): Date {
    return this._lastUpdate;
  }

  /** @inheritDoc */
  public get dingActive(): boolean {
    return this._dingActive;
  }

  /** @inheritDoc */
  public get personDetected(): boolean {
    return this._dingActive;
  }

  /** @inheritDoc */
  public get info(): DeviceInfo {
    return this._info;
  }

  /** @inheritDoc */
  public get timeSinceDing(): number {
    return Math.round((Utils.nowMS() - this._lastDing) / 1000);
  }

  /** @inheritDoc */
  public get id(): string {
    return this.info.allDevicesKey ?? `door-${this.info.room}-${this.info.customName}`;
  }

  /** @inheritDoc */
  public addDingCallback(pCallback: (action: DingSensorAction) => void): void {
    this._dingCallback.push(pCallback);
  }

  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, `${this.name}: ${message}`, {
      debugType: debugType,
      room: this.room?.roomName ?? '',
      deviceId: this.name,
      deviceName: this.name,
    });
  }

  protected onNewDingActiveValue(newValue: boolean): void {
    this.log(LogLevel.Debug, `Update for DingActive to value: ${newValue}`);
    this._dingActive = newValue;
    if (newValue) {
      this.resetDingActiveFallbackTimeout();
    } else {
      return;
    }
    this._lastDing = Utils.nowMS();
    this.dingsToday++;
    this.log(LogLevel.Trace, `This is ding no. ${this.dingsToday}`);

    if (this.settings.alertDingOnTelegram && this._dingActive) {
      TelegramService.sendMessageToSubscriber(`${this.name} detected ding`);
    }

    for (const c of this._dingCallback) {
      c(new DingSensorAction(this));
    }
  }

  protected abstract resetDingActiveState(): void;

  private resetDingActiveFallbackTimeout(): void {
    if (this._dingActiveFallbackTimeout !== null) {
      clearTimeout(this._dingActiveFallbackTimeout);
      this._dingActiveFallbackTimeout = null;
    }
    this._dingActiveFallbackTimeout = Utils.guardedTimeout(
      () => {
        this._dingActiveFallbackTimeout = null;
        this._dingActive = false;
        this.resetDingActiveState();
      },
      10000,
      this,
    );
  }
}
