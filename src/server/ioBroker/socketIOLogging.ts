export enum SocketIoLogLevel {
  Error = 1,
  Warn = 2,
  Info = 3,
  Debug = 4,
  Trace = 5,
  DeepTrace = 6,
}

export class SocketIoLogging {
  public static LogLevel = 5;
  public static writeLog(pLevel: SocketIoLogLevel, pMessage: string): void {
    if (pLevel > SocketIoLogging.LogLevel) {
      return;
    }

    switch (pLevel) {
      case SocketIoLogLevel.Error:
        console.error(pMessage);
        break;
      case SocketIoLogLevel.Warn:
        console.warn(pMessage);
        break;
      default:
        console.log(pMessage);
        break;
    }
  }
}
