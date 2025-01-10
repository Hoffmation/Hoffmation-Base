// TODO: Migrate to normale Log-Service
import { iobrokerConnectionLogLevel } from '../enums';

export class iobrokerConnectionLogging {
  /**
   * The LogLevel for the iobrokerConnectionLogging
   */
  public static LogLevel = 5;

  public static writeLog(pLevel: iobrokerConnectionLogLevel, pMessage: string): void {
    if (pLevel > iobrokerConnectionLogging.LogLevel) {
      return;
    }
    const message: string = `${new Date().toISOString()}: ${pMessage}`;
    switch (pLevel) {
      case iobrokerConnectionLogLevel.Error:
        console.error(message);
        break;
      case iobrokerConnectionLogLevel.Warn:
        console.warn(message);
        break;
      default:
        console.log(message);
        break;
    }
  }
}
