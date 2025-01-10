import _ from 'lodash';
import { iRoomBase, iScene } from '../../interfaces';
import { Persistence } from '../../services';
import { SceneSettings } from '../deviceSettings';
import { DeviceCapability, DeviceType, LogDebugType, LogLevel } from '../../enums';
import { DeviceInfo } from '../DeviceInfo';
import { Devices } from '../devices';
import { Utils } from '../../utils';
import { ServerLogService } from '../../logging';
import { TvDevice } from '../tv';

export class RoomScene implements iScene {
  /** @inheritDoc */
  public description: string = '';
  /** @inheritDoc */
  public room: iRoomBase | undefined;
  /** @inheritDoc */
  public settings: SceneSettings = new SceneSettings();
  protected _deviceType: DeviceType;
  protected _info: DeviceInfo;
  private readonly _onSceneStart: () => void;
  private readonly _onSceneEnd: () => void;
  private _automaticEndTimeout: NodeJS.Timeout | null = null;
  private _deviceCapabilities: DeviceCapability[] = [DeviceCapability.scene];
  private _on: boolean = false;

  public constructor(
    name: string,
    room: iRoomBase,
    onSceneStart: () => void,
    onSceneEnd: () => void,
    turnOffTimeout?: number,
  ) {
    this._onSceneStart = onSceneStart;
    this._onSceneEnd = onSceneEnd;
    this.room = room;
    this.settings.defaultTurnOffTimeout = turnOffTimeout;
    this._info = new DeviceInfo();
    this._info.fullName = `Scene ${name}`;
    this._info.customName = `${room.roomName} ${name}`;
    this._info.room = room.roomName;
    this._info.allDevicesKey = `scene-${room.roomName}-${name}`;
    this._deviceType = DeviceType.RoomScene;
    Devices.alLDevices[this._info.allDevicesKey] = this;
    this.persistDeviceInfo();
    this.loadDeviceSettings();
  }

  /** @inheritDoc */
  public get customName(): string {
    return this.info.customName;
  }

  /** @inheritDoc */
  public get deviceType(): DeviceType {
    return this._deviceType;
  }

  /** @inheritDoc */
  public get info(): DeviceInfo {
    return this._info;
  }

  /** @inheritDoc */
  public get automaticEndTimeout(): NodeJS.Timeout | null {
    return this._automaticEndTimeout;
  }

  /** @inheritDoc */
  public get deviceCapabilities(): DeviceCapability[] {
    return this._deviceCapabilities;
  }

  /** @inheritDoc */
  public get on(): boolean {
    return this._on;
  }

  public get name(): string {
    return this.info.customName;
  }

  /** @inheritDoc */
  public get id(): string {
    return this.info.allDevicesKey ?? `ac-${this.info.room}-${this.info.customName}`;
  }

  /** @inheritDoc */
  public get onSceneEnd(): () => void {
    return this._onSceneEnd;
  }

  /** @inheritDoc */
  public get onSceneStart(): () => void {
    return this._onSceneStart;
  }

  /** @inheritDoc */
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

  /** @inheritDoc */
  public endScene(): void {
    if (this._automaticEndTimeout != null) {
      clearTimeout(this._automaticEndTimeout);
      this._automaticEndTimeout = null;
    }
    if (!this._on) {
      return;
    }
    this.log(LogLevel.Info, 'Ending scene');
    this._on = false;
    this._onSceneEnd();
  }

  /** @inheritDoc */
  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, `${this.name}: ${message}`, {
      debugType: debugType,
      room: this.room?.roomName ?? '',
      deviceId: this.name,
      deviceName: this.name,
    });
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
  public loadDeviceSettings(): void {
    this.settings.initializeFromDb(this);
  }

  /** @inheritDoc */
  public toJSON(): Partial<TvDevice> {
    // eslint-disable-next-line
    const result: any = _.omit(this, ['room', '_onSceneStart', '_onSceneEnd']);
    return Utils.jsonFilter(result);
  }
}
