import { iBaseDevice, iCameraDevice, iCameraSettings, iCountToday } from '../interfaces';
import { CameraSettings } from '../settingsObjects';
import { CommandSource, DeviceCapability, DeviceType, LogDebugType, LogLevel } from '../enums';
import { Base64Image } from '../models';
import { MotionSensorAction } from '../action';
import { DeviceInfo } from './DeviceInfo';
import { Devices } from './devices';
import { Persistence, TelegramService } from '../services';
import { Utils } from '../utils';
import { ServerLogService } from '../logging';
import { RoomBaseDevice } from './RoomBaseDevice';

export abstract class CameraDevice extends RoomBaseDevice implements iCameraDevice {
  /** @inheritDoc */
  public settings: iCameraSettings = new CameraSettings();
  /**
   * The human readable name of this device
   */
  public readonly name: string;
  /** @inheritDoc */
  abstract readonly mpegStreamLink: string;
  /** @inheritDoc */
  abstract readonly h264IosStreamLink: string;
  /** @inheritDoc */
  abstract readonly rtspStreamLink: string;
  /** @inheritDoc */
  abstract readonly currentImageLink: string;
  /** @inheritDoc */
  public detectionsToday: number = 0;
  protected _lastMotion: number = 0;
  protected _initialized: boolean = false;
  protected _movementDetectedCallback: Array<(action: MotionSensorAction) => void> = [];
  protected _lastImage: string = '';
  protected _personDetected: boolean = false;
  protected _dogDetected: boolean = false;
  protected _devicesBlockingAlarmMap: Map<string, iBaseDevice> = new Map<string, iBaseDevice>();
  protected _movementDetected: boolean = false;
  private _personDetectFallbackTimeout: NodeJS.Timeout | null = null;
  private _movementDetectFallbackTimeout: NodeJS.Timeout | null = null;
  private _dogDetectFallbackTimeout: NodeJS.Timeout | null = null;

  protected _lastUpdate: Date = new Date(0);

  public get lastUpdate(): Date {
    return this._lastUpdate;
  }

  protected constructor(name: string, roomName: string) {
    const info = new DeviceInfo();
    info.fullName = `Camera ${roomName} ${name}`;
    info.customName = `Camera ${name}`;
    info.room = roomName;
    const allDevicesKey = `camera-${roomName}-${name}`;
    info.allDevicesKey = allDevicesKey;
    super(info, DeviceType.Camera);
    this.jsonOmitKeys.push('_lastImage');
    this.deviceCapabilities.push(DeviceCapability.camera);
    this.deviceCapabilities.push(DeviceCapability.motionSensor);
    this.name = name;
    Devices.alLDevices[allDevicesKey] = this;
    Utils.guardedTimeout(this.initializeMovementCounter, 4000, this);
  }

  /** @inheritDoc */
  public get lastImage(): string {
    return this._lastImage;
  }

  /** @inheritDoc */
  public get dogDetected(): boolean {
    return this._dogDetected;
  }

  /** @inheritDoc */
  public get personDetected(): boolean {
    return this._personDetected;
  }

  /** @inheritDoc */
  public get alarmBlockedByDevices(): boolean {
    return this._devicesBlockingAlarmMap.size > 0;
  }

  /** @inheritDoc */
  public get movementDetected(): boolean {
    return this._movementDetected;
  }

  /** @inheritDoc */
  public get info(): DeviceInfo {
    return this._info;
  }

  /** @inheritDoc */
  public get timeSinceLastMotion(): number {
    return Math.round((Utils.nowMS() - this._lastMotion) / 1000);
  }

  /** @inheritDoc */
  public get id(): string {
    return this.info.allDevicesKey ?? `camera-${this.info.room}-${this.info.customName}`;
  }

  /** @inheritDoc */
  public addMovementCallback(pCallback: (action: MotionSensorAction) => void): void {
    this._movementDetectedCallback.push(pCallback);
  }

  /** @inheritDoc */
  public blockForDevice(device: iBaseDevice, block: boolean): void {
    if (block) {
      this._devicesBlockingAlarmMap.set(device.id, device);
    } else {
      this._devicesBlockingAlarmMap.delete(device.id);
    }
    this.log(
      LogLevel.Debug,
      `Handle device ${block ? 'block' : 'unblock'}, new blocking amount: ${this._devicesBlockingAlarmMap.size}`,
    );
  }

  /** @inheritDoc */
  public setPersonDetected(): void {
    this.onNewPersonDetectedValue(true, CommandSource.ApiAutomatic);
  }

  /** @inheritDoc */
  public persistMotionSensor(): void {
    Persistence.dbo?.persistMotionSensor(this);
  }

  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, `${this.name}: ${message}`, {
      debugType: debugType,
      room: this.room?.roomName ?? '',
      deviceId: this.name,
      deviceName: this.name,
    });
  }

  private initializeMovementCounter(): void {
    if (!Persistence.anyDboActive) {
      this._initialized = true;
      return;
    }
    Persistence.dbo
      ?.motionSensorTodayCount(this)
      .then((todayCount: iCountToday) => {
        this.detectionsToday = todayCount.count ?? 0;
        this.log(LogLevel.Debug, `Reinitialized movement counter with ${this.detectionsToday}`);
        this._initialized = true;
      })
      .catch((err: Error) => {
        this.log(LogLevel.Warn, `Failed to initialize movement counter, err ${err?.message ?? err}`);
      });
  }

  protected onNewMotionDetectedValue(newValue: boolean): void {
    if (this.settings.movementDetectionOnPersonOnly) {
      return;
    }
    this.log(LogLevel.Debug, `Update for "Motion" to value: ${newValue}`);
    this.updateMovement(newValue);
    if (newValue) {
      this.resetMovementFallbackTimer();
    }
  }

  protected onNewPersonDetectedValue(newValue: boolean, source: CommandSource = CommandSource.Automatic): void {
    this.log(LogLevel.Debug, `Update for PersonDetected to value: ${newValue}`);
    if (newValue) {
      this.log(LogLevel.Info, `Person Detected (${CommandSource[source]})`);
      this.resetPersonDetectFallbackTimer();
    }
    this._personDetected = newValue;
    if (this.settings.movementDetectionOnPersonOnly) {
      this.updateMovement(newValue, source);
    }
  }

  protected onNewImageSnapshot(image: string): void {
    this._lastImage = image;
    Utils.guardedTimeout(() => {
      // Give Person Detected Update some time, as otherwise personDetected might still be false
      if (this.settings.alertPersonOnTelegram && this._personDetected && !this.alarmBlockedByDevices) {
        TelegramService.sendImage(`${this.name} detected Person`, new Base64Image(this._lastImage, 'person_alert'));
      }
    }, 1000);
  }

  protected onNewDogDetectionValue(newDogDetectionVal: boolean): void {
    if (newDogDetectionVal) {
      this.log(LogLevel.Info, 'Dog Detected');
      this.resetDogDetectFallbackTimer();
    }
    this._dogDetected = newDogDetectionVal;
    if (this.settings.movementDetectionOnDogsToo) {
      this.updateMovement(newDogDetectionVal);
    }
  }

  protected abstract resetPersonDetectedState(): void;

  protected abstract resetDogDetectedState(): void;

  protected abstract resetMovementDetectedState(): void;

  private updateMovement(newState: boolean, source: CommandSource = CommandSource.Automatic): void {
    if (!this._initialized && newState) {
      this.log(LogLevel.Trace, 'Movement recognized, but database initialization has not finished yet --> delay.');
      Utils.guardedTimeout(
        () => {
          this.updateMovement(newState, source);
        },
        1000,
        this,
      );
      return;
    }

    if (newState === this.movementDetected) {
      this.log(
        LogLevel.Debug,
        `Skip movement because state is already ${newState}`,
        LogDebugType.SkipUnchangedMovementState,
      );
      return;
    }
    this._lastMotion = Utils.nowMS();
    this._movementDetected = newState;
    this.persistMotionSensor();
    this.log(LogLevel.Debug, `New movement state: ${newState}`, LogDebugType.NewMovementState);

    if (newState) {
      this.detectionsToday++;
      this.log(LogLevel.Trace, `This is movement no. ${this.detectionsToday}`);
    }

    for (const c of this._movementDetectedCallback) {
      c(new MotionSensorAction(this, source));
    }
  }

  private resetPersonDetectFallbackTimer(): void {
    if (this._personDetectFallbackTimeout !== null) {
      clearTimeout(this._personDetectFallbackTimeout);
      this._personDetectFallbackTimeout = null;
    }
    this._personDetectFallbackTimeout = Utils.guardedTimeout(
      () => {
        this._personDetectFallbackTimeout = null;
        this._personDetected = false;
        if (this.settings.movementDetectionOnPersonOnly) {
          this.updateMovement(false);
        }
        this.resetPersonDetectedState();
      },
      120000,
      this,
    );
  }

  private resetMovementFallbackTimer(): void {
    if (this._movementDetectFallbackTimeout !== null) {
      clearTimeout(this._movementDetectFallbackTimeout);
      this._movementDetectFallbackTimeout = null;
    }
    this._movementDetectFallbackTimeout = Utils.guardedTimeout(
      () => {
        this._movementDetectFallbackTimeout = null;
        if (!this._movementDetected) {
          // Der Fallback wird nicht benötigt, da bereits das Movement zurückgesetzt wurde
          return;
        }
        this._movementDetected = false;
        this.updateMovement(false);
        this.resetMovementDetectedState();
      },
      120000,
      this,
    );
  }

  private resetDogDetectFallbackTimer(): void {
    if (this._dogDetectFallbackTimeout !== null) {
      clearTimeout(this._dogDetectFallbackTimeout);
      this._dogDetectFallbackTimeout = null;
    }
    this._dogDetectFallbackTimeout = Utils.guardedTimeout(
      () => {
        this._dogDetectFallbackTimeout = null;
        this._dogDetected = false;
        if (this.settings.movementDetectionOnDogsToo) {
          this.updateMovement(false);
        }
        this.resetDogDetectedState();
      },
      120000,
      this,
    );
  }
}
