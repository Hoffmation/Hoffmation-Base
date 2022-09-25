export enum iobrokerConnectionLogLevel {
  Error = 1,
  Warn = 2,
  Info = 3,
  Debug = 4,
  Trace = 5,
  DeepTrace = 6,
}

export class iobrokerConnectionLogging {
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
