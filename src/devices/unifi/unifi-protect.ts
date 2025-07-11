import {
  ProtectApi,
  ProtectCameraConfig,
  ProtectChimeConfig,
  ProtectEventAdd,
  ProtectEventPacket,
  ProtectLightConfig,
  ProtectNvrBootstrap,
  ProtectNvrBootstrapInterface,
  ProtectSensorConfig,
  ProtectViewerConfig,
} from 'unifi-protect';
import { OwnUnifiCamera } from './own-unifi-camera';
import { LogLevel, LogSource } from '../../enums';
import { iDisposable, iUnifiProtectOptions } from '../../interfaces';
import { ServerLogService } from '../../logging';
import { Utils } from '../../utils';
import { UnifiLogger } from './unifi-logger';

export class UnifiProtect implements iDisposable {
  private readonly unifiLogger: UnifiLogger = new UnifiLogger(LogSource.UnifiProtect);
  private readonly _api: ProtectApi;
  /**
   * Mapping for own devices
   */
  public static readonly ownCameras: Map<string, OwnUnifiCamera> = new Map<string, OwnUnifiCamera>();
  private _deviceStates: Map<string, unknown> = new Map<string, unknown>();
  private _idMap: Map<string, string> = new Map<string, string>();
  private _eventMap: Map<string, ProtectEventAdd> = new Map<string, ProtectEventAdd>();
  private _lastUpdate: Date = new Date(0);

  public constructor(settings: iUnifiProtectOptions) {
    this._api = new ProtectApi(this.unifiLogger);
    this.reconnect(settings);
    Utils.guardedInterval(
      () => {
        if (new Date().getTime() - this._lastUpdate.getTime() < 180 * 1000) {
          // We had an update within the last 3 minutes --> no need to reconnect
          return;
        }
        this.reconnect(settings);
      },
      5 * 60 * 1000,
    );
  }

  private reconnect(settings: iUnifiProtectOptions): void {
    this._eventMap = new Map<string, ProtectEventAdd>();
    this._api
      .login(settings.nvrAddress, settings.username, settings.password)
      .then((_loggedIn: boolean): void => {
        this.initialize();
      })
      .catch((error: unknown): void => {
        ServerLogService.writeLog(LogLevel.Error, `Unifi-Protect: Login failed: ${error}`);
      });
  }

  public dispose(): void {
    this._api.logout();
  }

  public static addDevice(camera: OwnUnifiCamera): void {
    this.ownCameras.set((camera as OwnUnifiCamera).unifiCameraName, camera);
  }

  private async initialize(): Promise<void> {
    this.unifiLogger.info('Unifi-Protect: Login successful');
    const bootstrap: boolean = await this._api.getBootstrap();
    if (!bootstrap || !this._api.bootstrap) {
      this.unifiLogger.error('Unifi-Protect: Bootstrap failed');
      return;
    }
    const info: ProtectNvrBootstrapInterface = this._api.bootstrap as ProtectNvrBootstrap;
    for (const camera of info.cameras) {
      this.initializeCamera(camera);
    }
    this._api.on('message', this.onMessage.bind(this));
  }

  private onMessage(packet: ProtectEventPacket): void {
    const payload = packet.payload as ProtectDeviceConfigTypes;
    this._lastUpdate = new Date();
    switch (packet.header.modelKey) {
      case 'nvr':
        break;

      default:
        // Lookup the device.
        let id: string = packet.header.id;
        let baseEvent: ProtectEventAdd | undefined;
        if (packet.header.action === 'add') {
          const addEvent: ProtectEventAdd = packet.payload as ProtectEventAdd;
          id = addEvent.camera ?? addEvent.cameraId;
          this.rememberAddEvent(packet, addEvent);
        } else if (packet.header.action === 'update' && this._eventMap.has(id)) {
          baseEvent = this._eventMap.get(id);
          id = baseEvent?.camera ?? baseEvent?.cameraId ?? '';
        }
        const ownName: string | undefined = this._idMap.get(id);
        if (!ownName) {
          break;
        }
        const ownCamera: OwnUnifiCamera | undefined = UnifiProtect.ownCameras.get(ownName);
        if (ownCamera !== undefined) {
          ownCamera.update(packet, baseEvent);
          break;
        }

        break;
    }

    // Update the internal list we maintain.
    if (packet.header.action === 'update') {
      this._deviceStates.set(packet.header.id, Object.assign(this._deviceStates.get(packet.header.id) ?? {}, payload));
    }
  }

  private rememberAddEvent(packet: ProtectEventPacket, addEvent: ProtectEventAdd): void {
    if (packet.header.modelKey === 'event') {
      this._eventMap.set(addEvent.id, addEvent);
      Utils.guardedTimeout(
        () => {
          this._eventMap.delete(addEvent.id);
        },
        5 * 60 * 1000,
        this,
      );
    }
  }

  private initializeCamera(data: ProtectCameraConfig): void {
    if (!UnifiProtect.ownCameras.has(data.name)) {
      ServerLogService.writeLog(LogLevel.Info, `Unifi-Protect: Ignoring camera ${data.name}`);
      return;
    }
    const camera: OwnUnifiCamera = UnifiProtect.ownCameras.get(data.name) as OwnUnifiCamera;
    camera.initialize(data);
    ServerLogService.writeLog(LogLevel.Info, `Unifi-Protect: Camera ${data.name} (re)initialized`);
    this._idMap.set(data.id, data.name);
  }
}

type ProtectDeviceConfigTypes =
  | ProtectCameraConfig
  | ProtectChimeConfig
  | ProtectLightConfig
  | ProtectSensorConfig
  | ProtectViewerConfig;
