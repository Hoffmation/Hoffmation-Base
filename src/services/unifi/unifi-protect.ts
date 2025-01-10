import {
  ProtectApi,
  ProtectCameraConfig,
  ProtectLogging,
  ProtectNvrBootstrap,
  ProtectNvrBootstrapInterface,
} from 'unifi-protect';
import { OwnUnifiCamera } from './own-unifi-camera';
import { LogLevel, LogSource } from '../../enums';
import { iCameraDevice, iDisposable, iUnifiProtectOptions } from '../../interfaces';
import { ServerLogService } from '../../logging';

export class UnifiProtect implements iDisposable {
  private readonly unifiLogger: UnifiLogger = new UnifiLogger();
  private readonly _api: ProtectApi;
  /**
   * Mapping for own devices
   */
  private static readonly ownDevices: Map<string, iCameraDevice> = new Map<string, iCameraDevice>();

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
  }

  public static addDevice(camera: iCameraDevice): void {
    this.ownDevices.set((camera as OwnUnifiCamera).unifiCameraName, camera);
  }

  private initializeCamera(data: ProtectCameraConfig): void {
    ServerLogService.writeLog(LogLevel.Info, `Unifi-Protect: Camera ${data.name} initialized`);
    if (!UnifiProtect.ownDevices.has(data.name)) {
      return;
    }
    const camera: OwnUnifiCamera = UnifiProtect.ownDevices.get(data.name) as OwnUnifiCamera;
    camera.initialize(data);
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
