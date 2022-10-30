import { iScene } from '../baseDeviceInterfaces';
import { LogLevel, RoomBase } from '../../../models';
import { TvDevice } from '../tv';
import { LogDebugType, ServerLogService, Utils } from '../../services';
import { DeviceInfo } from '../DeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import { DeviceType } from '../deviceType';
import { Devices } from '../devices';
import _ from 'lodash';
import { SceneSettings } from '../../../models/deviceSettings/sceneSettings';

export class RoomScene implements iScene {
  public room: RoomBase | undefined;
  public settings: SceneSettings = new SceneSettings();
  private readonly _onSceneStart: () => void;
  private readonly _onSceneEnd: () => void;

  public constructor(
    name: string,
    roomName: string,
    onSceneStart: () => void,
    onSceneEnd: () => void,
    turnOffTimeout?: number,
  ) {
    this._onSceneStart = onSceneStart;
    this._onSceneEnd = onSceneEnd;
    this.settings.defaultTurnOffTimeout = turnOffTimeout;
    this._info = new DeviceInfo();
    this._info.fullName = `TV ${name}`;
    this._info.customName = `${roomName} ${name}`;
    this._info.room = roomName;
    this._info.allDevicesKey = `tv-${roomName}-${name}`;
    this._deviceType = DeviceType.RoomScene;
    Devices.alLDevices[this._info.allDevicesKey] = this;
    this.persistDeviceInfo();
  }

  protected _deviceType: DeviceType;

  public get deviceType(): DeviceType {
    return this._deviceType;
  }

  protected _info: DeviceInfo;

  public get info(): DeviceInfo {
    return this._info;
  }

  public set info(info: DeviceInfo) {
    this._info = info;
  }

  private _automaticEndTimeout: NodeJS.Timeout | null = null;

  public get automaticEndTimeout(): NodeJS.Timeout | null {
    return this._automaticEndTimeout;
  }

  private _deviceCapabilities: DeviceCapability[] = [DeviceCapability.scene];

  public get deviceCapabilities(): DeviceCapability[] {
    return this._deviceCapabilities;
  }

  private _on: boolean = false;

  public get on(): boolean {
    return this._on;
  }

  public get name(): string {
    return this.info.customName;
  }

  public get id(): string {
    return this.info.allDevicesKey ?? `ac-${this.info.room}-${this.info.customName}`;
  }

  public get onSceneEnd(): () => void {
    return this._onSceneEnd;
  }

  public get onSceneStart(): () => void {
    return this._onSceneStart;
  }

  public startScene(timeout?: number | undefined): void {
    if (this._automaticEndTimeout != null) {
      clearTimeout(this._automaticEndTimeout);
      this._automaticEndTimeout = null;
    }
    this._on = true;
    this._onSceneStart();
    const turnOffTimeout: number | undefined = timeout ?? this.settings.defaultTurnOffTimeout;
    this.log(LogLevel.Info, `Starting scene (timeout: ${turnOffTimeout})`);
    if (turnOffTimeout) {
      this._automaticEndTimeout = Utils.guardedTimeout(
        () => {
          this._automaticEndTimeout = null;
          this.endScene();
        },
        turnOffTimeout,
        this,
      );
    }
  }

  public endScene(): void {
    if (this._automaticEndTimeout != null) {
      clearTimeout(this._automaticEndTimeout);
      this._automaticEndTimeout = null;
    }
    if (!this._on) {
      return;
    }
    this.log(LogLevel.Info, `Ending scene`);
    this._on = false;
    this._onSceneEnd();
  }

  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, `${this.name}: ${message}`, {
      debugType: debugType,
      room: this.room?.roomName ?? '',
      deviceId: this.name,
      deviceName: this.name,
    });
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

  public toJSON(): Partial<TvDevice> {
    // eslint-disable-next-line
    const result: any = _.omit(this, ['room', '_onSceneStart', '_onSceneEnd']);
    return Utils.jsonFilter(result);
  }
}
