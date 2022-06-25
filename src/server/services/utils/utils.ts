import { ServerLogService } from '../log-service';
import { LogLevel } from '../../../models';
import _ from 'lodash';
import { Res } from '../Translation';
import { iPersist } from '../dbo';

export const DAYMS: number = 24 * 60 * 60 * 1000;

export class Utils {
  public static dbo: iPersist | undefined;

  public static get timeTilMidnight(): number {
    return new Date(Utils.nowMS() + DAYMS).setHours(0, 0, 0, 0) - Utils.nowMS();
  }

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

  public static guard<T>(object: T | undefined | null) {
    if (object === undefined) {
      throw new Error('Guarded Value is undefined');
    }
    if (object === null) {
      throw new Error('Guarded Value is null');
    }
    return object;
  }

  public static jsonFilter(object: object): Partial<object> {
    return _.omit(
      object,
      Object.keys(object).filter((key): boolean => {
        if (key.includes('Timeout') || key.includes('Interval')) {
          // Exclude timeout Variables.
          return true;
        }
        return key.includes('Callback');
      }),
    );
  }

  public static testInitializeServices(): void {
    ServerLogService.settings.logLevel = -1;
    Res.initialize({ language: 'en' });
  }

  public static kWh(wattage: number, durationInMs: number): number {
    return (wattage * durationInMs) / 3600000000.0;
  }

  public static round(number: number, digits: number): number {
    const factor: number = Math.pow(10, digits);
    return Math.round(number * factor) / factor;
  }

  public static beetweenDays(date: Date, startDay: number, endDay: number): boolean {
    const yearStart = new Date(date.getTime());
    yearStart.setMonth(0, 1);
    const startDate = new Date(yearStart.getTime() + startDay * DAYMS);
    const endDate = new Date(yearStart.getTime() + endDay * DAYMS);
    return date <= endDate && date >= startDate;
  }
}
