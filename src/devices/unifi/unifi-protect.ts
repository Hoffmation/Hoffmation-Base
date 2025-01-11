import {
  ProtectApi,
  ProtectCameraConfig,
  ProtectChimeConfig,
  ProtectEventPacket,
  ProtectLightConfig,
  ProtectLogging,
  ProtectNvrBootstrap,
  ProtectNvrBootstrapInterface,
  ProtectSensorConfig,
  ProtectViewerConfig,
} from 'unifi-protect';
import { OwnUnifiCamera } from './own-unifi-camera';
import { LogLevel, LogSource } from '../../enums';
import { iDisposable, iUnifiProtectOptions } from '../../interfaces';
import { ServerLogService } from '../../logging';

export class UnifiProtect implements iDisposable {
  private readonly unifiLogger: UnifiLogger = new UnifiLogger();
  private readonly _api: ProtectApi;
  /**
   * Mapping for own devices
   */
  public static readonly ownCameras: Map<string, OwnUnifiCamera> = new Map<string, OwnUnifiCamera>();
  private _deviceStates: Map<string, unknown> = new Map<string, unknown>();
  private _idMap: Map<string, string> = new Map<string, string>();

  public constructor(settings: iUnifiProtectOptions) {
    this._api = new ProtectApi(this.unifiLogger);
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
    switch (packet.header.action) {
      case 'add':
        // this.onAdd(packet);
        break;

      case 'remove':
        // this.onRemove(packet);

        break;

      case 'update':
        this.onUpdate(packet);
        break;

      default:
        break;
    }
  }

  private onUpdate(packet: ProtectEventPacket): void {
    const payload = packet.payload as ProtectDeviceConfigTypes;

    switch (packet.header.modelKey) {
      case 'nvr':
        // Update for NVR itselft

        break;

      default:
        // Lookup the device.
        const ownName: string | undefined = this._idMap.get(packet.header.id);
        if (!ownName) {
          break;
        }
        const ownCamera: OwnUnifiCamera | undefined = UnifiProtect.ownCameras.get(ownName);
        if (ownCamera !== undefined) {
          ownCamera.update(packet.payload as unknown as ProtectCameraConfig);
          break;
        }

        // TODO: Add more Device Types

        break;
    }

    // Update the internal list we maintain.
    this._deviceStates.set(packet.header.id, Object.assign(this._deviceStates.get(packet.header.id) ?? {}, payload));
  }

  private initializeCamera(data: ProtectCameraConfig): void {
    ServerLogService.writeLog(LogLevel.Info, `Unifi-Protect: Camera ${data.name} initialized`);
    if (!UnifiProtect.ownCameras.has(data.name)) {
      return;
    }
    const camera: OwnUnifiCamera = UnifiProtect.ownCameras.get(data.name) as OwnUnifiCamera;
    camera.initialize(data);
    this._idMap.set(data.id, data.name);
  }
}

class UnifiLogger implements ProtectLogging {
  public debug(message: string, ..._parameters: unknown[]): void {
    ServerLogService.writeLog(LogLevel.Debug, message, {
      source: LogSource.UnifiProtect,
    });
  }

  public error(message: string, ..._parameters: unknown[]): void {
    ServerLogService.writeLog(LogLevel.Error, message, {
      source: LogSource.UnifiProtect,
    });
  }

  public info(message: string, ..._parameters: unknown[]): void {
    ServerLogService.writeLog(LogLevel.Info, message, {
      source: LogSource.UnifiProtect,
    });
  }

  public warn(message: string, ..._parameters: unknown[]): void {
    ServerLogService.writeLog(LogLevel.Warn, message, {
      source: LogSource.UnifiProtect,
    });
  }
}

type ProtectDeviceConfigTypes =
  | ProtectCameraConfig
  | ProtectChimeConfig
  | ProtectLightConfig
  | ProtectSensorConfig
  | ProtectViewerConfig;
