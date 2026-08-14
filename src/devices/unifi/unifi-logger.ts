import type { ProtectLogging } from 'unifi-protect';
import { format } from 'node:util';
import { ServerLogService } from '../../logging';
import { LogDebugType, LogLevel, LogSource } from '../../enums';

export class UnifiLogger implements ProtectLogging {
  public constructor(private readonly source: LogSource) {}

  public debug(message: string, ...parameters: unknown[]): void {
    ServerLogService.writeLog(LogLevel.Debug, format(message, ...parameters), {
      source: this.source,
      // Several per second since v5 --> opt-in via logSettings.debugUnifi.
      debugType: LogDebugType.UnifiLibrary,
    });
  }

  public error(message: string, ...parameters: unknown[]): void {
    ServerLogService.writeLog(LogLevel.Error, format(message, ...parameters), {
      source: this.source,
    });
  }

  public info(message: string, ...parameters: unknown[]): void {
    ServerLogService.writeLog(LogLevel.Info, format(message, ...parameters), {
      source: this.source,
    });
  }

  public warn(message: string, ...parameters: unknown[]): void {
    ServerLogService.writeLog(LogLevel.Warn, format(message, ...parameters), {
      source: this.source,
    });
  }
}
