import _ from 'lodash';
import { iBaseDevice, iCameraDevice, iRoomDevice } from '../baseDeviceInterfaces';
import { Base64Image, CameraSettings, CountToday, LogLevel, RoomBase } from '../../../models';
import { BlueIrisCoordinator } from './blueIrisCoordinator';
import { API, LogDebugType, ServerLogService, SettingsService, TelegramService, Utils } from '../../services';
import { Devices } from '../devices';
import { DeviceInfo } from '../DeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import { DeviceType } from '../deviceType';
import { ioBrokerMain } from '../../ioBroker';

export class CameraDevice implements iCameraDevice {
  /**
   * The name of the camera in BlueIris
   */
  public readonly blueIrisName: string;
  private _personDetectFallbackTimeout: NodeJS.Timeout | null = null;
  private _movementDetectFallbackTimeout: NodeJS.Timeout | null = null;
  private _dogDetectFallbackTimeout: NodeJS.Timeout | null = null;
  private _personDetectedStateId: string | undefined = undefined;
  private _dogDetectedStateId: string | undefined = undefined;
  private _movementDetectedStateId: string | undefined = undefined;

  public get lastImage(): string {
    return this._lastImage;
  }

  /** @inheritDoc */
  public settings: CameraSettings = new CameraSettings();
  /** @inheritDoc */
  public readonly deviceCapabilities: DeviceCapability[] = [DeviceCapability.camera, DeviceCapability.motionSensor];
  /** @inheritDoc */
  public deviceType: DeviceType = DeviceType.Camera;
  /**
   * The human readable name of this device
   */
  public readonly name: string;
  protected _lastMotion: number = 0;
  private _initialized: boolean = false;
  private _movementDetectedCallback: Array<(pValue: boolean) => void> = [];
  private _lastImage: string = '';
  private _personDetected: boolean = false;
  private _dogDetected: boolean = false;
  private _devicesBlockingAlarmMap: Map<string, iBaseDevice> = new Map<string, iBaseDevice>();
  /** @inheritDoc */
  public readonly mpegStreamLink: string = '';
  /** @inheritDoc */
  public readonly h264IosStreamLink: string = '';
  /** @inheritDoc */
  public readonly rtspStreamLink: string = '';
  /** @inheritDoc */
  public readonly currentImageLink: string = '';

  public get dogDetected(): boolean {
    return this._dogDetected;
  }

  public get personDetected(): boolean {
    return this._personDetected;
  }

  public get alarmBlockedByDevices(): boolean {
    return this._devicesBlockingAlarmMap.size > 0;
  }

  public constructor(mqttName: string, roomName: string, blueIrisName: string) {
    this.blueIrisName = blueIrisName;
    this.name = mqttName;
    this._info = new DeviceInfo();
    this._info.fullName = `Camera ${roomName} ${mqttName}`;
    this._info.customName = `Camera ${mqttName}`;
    this._info.room = roomName;
    this._info.allDevicesKey = `camera-${roomName}-${mqttName}`;
    Devices.alLDevices[this._info.allDevicesKey] = this;
    BlueIrisCoordinator.addDevice(this, mqttName);
    this.persistDeviceInfo();
    this.loadDeviceSettings();
    const blueIrisSettings = SettingsService.settings.blueIris;
    if (blueIrisSettings !== undefined) {
      this.mpegStreamLink = `${blueIrisSettings.serverAddress}/mjpg/${this.blueIrisName}/video.mjpg?user=${blueIrisSettings.username}&pw=${blueIrisSettings.password}`;
      this.h264IosStreamLink = `${blueIrisSettings.serverAddress}/h264/${this.blueIrisName}/temp.m?user=${blueIrisSettings.username}&pw=${blueIrisSettings.password}`;
      this.rtspStreamLink = `rtsp://${blueIrisSettings.username}:${
        blueIrisSettings.password
      }@${blueIrisSettings.serverAddress.replace('http://', '')}:80/${this.blueIrisName}`;
      this.currentImageLink = `${blueIrisSettings.serverAddress}/image/${this.blueIrisName}.jpg?q=100&s=100&user=${blueIrisSettings.username}&pw=${blueIrisSettings.password}`;
    }
    if (!Utils.anyDboActive) {
      this._initialized = true;
    } else {
      Utils.dbo
        ?.motionSensorTodayCount(this)
        .then((todayCount: CountToday) => {
          this.detectionsToday = todayCount.count ?? 0;
          this.log(LogLevel.Debug, `Reinitialized movement counter with ${this.detectionsToday}`);
          this._initialized = true;
        })
        .catch((err: Error) => {
          this.log(LogLevel.Warn, `Failed to initialize movement counter, err ${err?.message ?? err}`);
        });
    }
  }

  private _detectionsToday: number = 0;

  public get detectionsToday(): number {
    return this._detectionsToday;
  }

  public set detectionsToday(pVal: number) {
    this._detectionsToday = pVal;
  }

  private _movementDetected: boolean = false;

  public get movementDetected(): boolean {
    return this._movementDetected;
  }

  private _info: DeviceInfo;

  public get info(): DeviceInfo {
    return this._info;
  }

  public set info(info: DeviceInfo) {
    this._info = info;
  }

  /** @inheritDoc */
  public get timeSinceLastMotion(): number {
    return Math.round((Utils.nowMS() - this._lastMotion) / 1000);
  }

  public get customName(): string {
    return this.info.customName;
  }

  public get id(): string {
    return this.info.allDevicesKey ?? `camera-${this.info.room}-${this.info.customName}`;
  }

  public get room(): RoomBase | undefined {
    return API.getRoom(this.info.room);
  }

  /**
   * Adds a callback for when a motion state has changed.
   * @param pCallback - Function that accepts the new state as parameter
   */
  public addMovementCallback(pCallback: (newState: boolean) => void): void {
    this._movementDetectedCallback.push(pCallback);
  }

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

  public persistMotionSensor(): void {
    Utils.dbo?.persistMotionSensor(this);
  }

  public update(idSplit: string[], state: ioBroker.State): void {
    const stateName = idSplit[4];
    switch (stateName) {
      case 'MotionDetected':
        this._movementDetectedStateId = idSplit.join('.');
        if (this.settings.movementDetectionOnPersonOnly) {
          return;
        }
        this.log(LogLevel.Debug, `Update for "${stateName}" to value: ${state.val}`);
        const movementDetected: boolean = (state.val as number) === 1;
        this.updateMovement(movementDetected);
        if (movementDetected) {
          this.resetMovementFallbackTimer();
        }
        break;
      case 'PersonDetected':
        this._personDetectedStateId = idSplit.join('.');
        const newValue: boolean = (state.val as number) === 1;
        this.log(LogLevel.Debug, `Update for "${stateName}" to value: ${state.val}`);
        if (newValue) {
          this.log(LogLevel.Info, `Person Detected`);
          this.resetPersonDetectFallbackTimer();
        }
        this._personDetected = newValue;
        if (this.settings.movementDetectionOnPersonOnly) {
          this.updateMovement(newValue);
        }
        break;
      case 'DogDetected':
        this._dogDetectedStateId = idSplit.join('.');
        const newDogDetectionVal: boolean = (state.val as number) === 1;
        this.log(LogLevel.Debug, `Update for "${stateName}" to value: ${state.val}`);
        if (newDogDetectionVal) {
          this.log(LogLevel.Info, `Dog Detected`);
          this.resetDogDetectFallbackTimer();
        }
        this._dogDetected = newDogDetectionVal;
        if (this.settings.movementDetectionOnDogsToo) {
          this.updateMovement(newDogDetectionVal);
        }
        break;
      case 'MotionSnapshot':
        this._lastImage = state.val as string;
        Utils.guardedTimeout(() => {
          // Give Person Detected Update some time, as otherwise personDetected might still be false
          if (this.settings.alertPersonOnTelegram && this._personDetected && !this.alarmBlockedByDevices) {
            TelegramService.sendImage(`${this.name} detected Person`, new Base64Image(this._lastImage, 'person_alert'));
          }
        }, 1000);
    }
  }

  public updateMovement(newState: boolean): void {
    if (!this._initialized && newState) {
      this.log(LogLevel.Trace, `Movement recognized, but database initialization has not finished yet --> delay.`);
      Utils.guardedTimeout(
        () => {
          this.updateMovement(newState);
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
      c(newState);
    }
  }

  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, `${this.name}: ${message}`, {
      debugType: debugType,
      room: this.room?.roomName ?? '',
      deviceId: this.name,
      deviceName: this.name,
    });
  }

  public toJSON(): Partial<iRoomDevice> {
    return Utils.jsonFilter(
      _.omit(this, [
        // To reduce Byte-size on cyclic update
        '_lastImage',
      ]),
    );
  }

  public persistDeviceInfo(): void {
    Utils.guardedTimeout(
      () => {
        Utils.dbo?.addDevice(this);
      },
      5000,
      this,
    );
  }

  public loadDeviceSettings(): void {
    this.settings?.initializeFromDb(this);
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
        if (this._personDetectedStateId !== undefined) {
          ioBrokerMain.iOConnection?.setState(this._personDetectedStateId, { val: 0, ack: true });
        }
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
        if (this._dogDetectedStateId !== undefined) {
          ioBrokerMain.iOConnection?.setState(this._dogDetectedStateId, { val: 0, ack: true });
        }
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
        if (this._movementDetectedStateId !== undefined) {
          ioBrokerMain.iOConnection?.setState(this._movementDetectedStateId, { val: 0, ack: true });
        }
      },
      120000,
      this,
    );
  }
}
