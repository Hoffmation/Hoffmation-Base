import { ProtectLogging } from 'unifi-protect';
import { ServerLogService } from '../../logging';
import { LogLevel, LogSource } from '../../enums';

export class UnifiLogger implements ProtectLogging {
  public constructor(private readonly source: LogSource) {}

  public debug(message: string, ..._parameters: unknown[]): void {
    ServerLogService.writeLog(LogLevel.Debug, message, {
      source: this.source,
    });
  }

  public error(message: string, ..._parameters: unknown[]): void {
    ServerLogService.writeLog(LogLevel.Error, message, {
      source: this.source,
    });
  }

  public info(message: string, ..._parameters: unknown[]): void {
    ServerLogService.writeLog(LogLevel.Info, message, {
      source: this.source,
    });
  }

  public warn(message: string, ..._parameters: unknown[]): void {
    ServerLogService.writeLog(LogLevel.Warn, message, {
      source: this.source,
    });
  }
}
