import { iUnifiProtectOptions } from '../../config';
import { ProtectApi, ProtectCameraConfig, ProtectNvrBootstrapInterface } from 'unifi-protect';
import { ProtectLogging } from 'unifi-protect/dist/protect-logging';
import { ServerLogService } from '../log-service';
import { LogLevel, LogSource } from '../../../models';
import { ProtectNvrBootstrap } from 'unifi-protect/dist/protect-types';

export class UnifiProtect {
  private readonly unifiLogger: UnifiLogger = new UnifiLogger();
  private readonly _api: ProtectApi;

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

  private initializeCamera(_camera: ProtectCameraConfig): void {
    // TODO: Initialize own Camera
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
