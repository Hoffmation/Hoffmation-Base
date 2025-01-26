import { iRoomBase, iScene } from '../../interfaces';
import { SceneSettings } from '../../settingsObjects';
import { DeviceCapability, DeviceType, LogLevel } from '../../enums';
import { DeviceInfo } from '../DeviceInfo';
import { Devices } from '../devices';
import { Utils } from '../../utils';
import { RoomBaseDevice } from '../RoomBaseDevice';

export class RoomScene extends RoomBaseDevice implements iScene {
  /** @inheritDoc */
  public description: string = '';
  /** @inheritDoc */
  public settings: SceneSettings = new SceneSettings();
  private readonly _onSceneStart: () => void;
  private readonly _onSceneEnd: () => void;
  private _automaticEndTimeout: NodeJS.Timeout | null = null;
  private _on: boolean = false;

  public constructor(
    name: string,
    room: iRoomBase,
    onSceneStart: () => void,
    onSceneEnd: () => void,
    turnOffTimeout?: number,
  ) {
    const info = new DeviceInfo();
    info.fullName = `Scene ${name}`;
    info.customName = `${room.roomName} ${name}`;
    info.room = room.roomName;
    const allDevicesKey = `scene-${room.roomName}-${name}`;
    info.allDevicesKey = allDevicesKey;
    super(info, DeviceType.RoomScene);
    this.jsonOmitKeys.push(...['_onSceneStart', '_onSceneEnd']);
    this.deviceCapabilities.push(DeviceCapability.scene);
    Devices.alLDevices[allDevicesKey] = this;
    this._onSceneStart = onSceneStart;
    this._onSceneEnd = onSceneEnd;
    this.settings.defaultTurnOffTimeout = turnOffTimeout;
  }

  /** @inheritDoc */
  public get customName(): string {
    return this.info.customName;
  }

  /** @inheritDoc */
  public get automaticEndTimeout(): NodeJS.Timeout | null {
    return this._automaticEndTimeout;
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
}
