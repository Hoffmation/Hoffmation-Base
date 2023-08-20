import _ from 'lodash';
import { iCameraDevice, iRoomDevice } from '../baseDeviceInterfaces';
import { Base64Image, CameraSettings, CountToday, LogLevel, RoomBase } from '../../../models';
import { BlueIrisCoordinator } from './blueIrisCoordinator';
import { API, LogDebugType, ServerLogService, SettingsService, TelegramService, Utils } from '../../services';
import { Devices } from '../devices';
import { DeviceInfo } from '../DeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import { DeviceType } from '../deviceType';

export class CameraDevice implements iCameraDevice {
  public readonly blueIrisName: string;

  public get lastImage(): string {
    return this._lastImage;
  }

  public settings: CameraSettings = new CameraSettings();
  public readonly deviceCapabilities: DeviceCapability[] = [DeviceCapability.camera, DeviceCapability.motionSensor];
  public deviceType: DeviceType = DeviceType.Camera;
  public readonly name: string;
  protected _lastMotion: number = 0;
  private _initialized: boolean = false;
  private _movementDetectedCallback: Array<(pValue: boolean) => void> = [];
  private _lastImage: string = '';
  private _personDetected: boolean = false;
  private _alarmGriffBlockCount: number = 0;
  private _alarmBlockedByGriffTimeStamp: number = 0;
  public readonly mpegStreamLink: string = '';
  public readonly h264IosStreamLink: string = '';
  public readonly rtspStreamLink: string = '';
  public readonly currentImageLink: string = '';

  public get alarmBlockedByGriffTimeStamp(): number {
    return this._alarmBlockedByGriffTimeStamp;
  }

  public get alarmBlockedByGriff(): boolean {
    return this._alarmGriffBlockCount > 0;
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

  /**
   * Time since Last Motion in seconds
   * @returns {number}
   */
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
   * @param pCallback Function that accepts the new state as parameter
   */
  public addMovementCallback(pCallback: (newState: boolean) => void): void {
    this._movementDetectedCallback.push(pCallback);
  }

  public onGriffUpdate(open: boolean): void {
    this._alarmGriffBlockCount += open ? 1 : -1;
    if (this._alarmGriffBlockCount < 0) {
      this._alarmGriffBlockCount = 0;
    }
    if (this._alarmGriffBlockCount == 1) {
      this._alarmBlockedByGriffTimeStamp = new Date().getTime();
    }
    this.log(LogLevel.Debug, `Handle change to open (${open}), new open amount: ${this._alarmGriffBlockCount}`);
  }

  public persistMotionSensor(): void {
    Utils.dbo?.persistMotionSensor(this);
  }

  public update(stateName: string, state: ioBroker.State): void {
    this.log(LogLevel.Debug, `Update for "${stateName}"`);
    switch (stateName) {
      case 'MotionDetected':
        if (this.settings.movementDetectionOnPersonOnly) {
          return;
        }
        this.updateMovement((state.val as number) === 1);
        break;
      case 'PersonDetected':
        const newValue: boolean = (state.val as number) === 1;
        if (newValue) {
          this.log(LogLevel.Info, `Person Detected`);
        }
        this._personDetected = newValue;
        if (this.settings.movementDetectionOnPersonOnly) {
          this.updateMovement(newValue);
        }
        break;
      case 'MotionSnapshot':
        this._lastImage = state.val as string;
        Utils.guardedTimeout(() => {
          // Give Person Detected Update some time, as otherwise personDetected might still be false
          if (this.settings.alertPersonOnTelegram && this._personDetected && !this.alarmBlockedByGriff) {
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
}
