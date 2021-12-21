import { ServerLogService } from '../log-service';
import { LogLevel } from '../../../models/logLevel';

export class Utils {
  public static async catchEm<T>(promise: Promise<T>): Promise<{ reason: Error | null; data: T | null }> {
    return promise
      .then((data: T) => ({
        reason: null,
        data,
      }))
      .catch((reason: Error) => ({
        reason,
        data: null,
      }));
  }

  public static guardedFunction(func: (...args: unknown[]) => void, thisContext: unknown | undefined): void {
    try {
      if (thisContext) {
        func.bind(thisContext)();
      } else {
        func();
      }
    } catch (e) {
      ServerLogService.writeLog(
        LogLevel.Error,
        `Guarded Function failed: ${(e as Error).message}\n Stack: ${(e as Error).stack}`,
      );
    }
  }

  public static nowMS(): number {
    return new Date().getTime();
  }

  public static guardedNewThread(func: (...args: unknown[]) => void, thisContext?: unknown | undefined): void {
    Utils.guardedTimeout(func, 1, thisContext);
  }

  public static guardedTimeout(
    func: (...args: unknown[]) => void,
    time: number,
    thisContext?: unknown | undefined,
  ): NodeJS.Timeout {
    return setTimeout(() => {
      Utils.guardedFunction(func, thisContext);
    }, time);
  }

  public static guardedInterval(
    func: (...args: unknown[]) => void,
    time: number,
    thisContext?: unknown | undefined,
    fireImmediate: boolean = false,
  ): NodeJS.Timeout {
    if (fireImmediate) {
      Utils.guardedFunction(func, thisContext);
    }
    return setInterval(() => {
      Utils.guardedFunction(func, thisContext);
    }, time);
  }

  public static nowString(): string {
    const d: Date = new Date();
    return `${d.toLocaleTimeString('de-DE')}.${d.getMilliseconds()}`;
  }

  static guard<T>(object: T | undefined | null) {
    if (object === undefined) {
      throw new Error('Guarded Value is undefined');
    }
    if (object === null) {
      throw new Error('Guarded Value is null');
    }
    return object;
  }
}
