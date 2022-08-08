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

  public static delay(ms: number): Promise<void> {
    return new Promise((res) => {
      setTimeout(res, ms);
    });
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
    return this.deepOmit(object, ['timeout', 'interval', 'timeouts', 'callback']);
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

  public static nowTime(): { hours: number; minutes: number } {
    const now = new Date();
    return { hours: now.getHours(), minutes: now.getMinutes() };
  }

  public static dateByTimeSpan(hours: number, minutes: number): Date {
    return new Date(new Date().setHours(hours, minutes));
  }

  public static positiveMod(number: number, mod: number): number {
    return ((number % mod) + mod) % mod;
  }

  public static degreeInBetween(minDegree: number, maxDegree: number, degreeToCheck: number) {
    const modMin: number = this.positiveMod(minDegree, 360);
    const modMax: number = this.positiveMod(maxDegree, 360);
    const modToCheck: number = this.positiveMod(degreeToCheck, 360);
    return modMin < modMax ? modToCheck <= modMax && modToCheck >= modMin : modToCheck > modMin || modToCheck < modMax;
  }

  private static deepOmit(obj: object, keysToOmit: string[]): object {
    // the inner function which will be called recursivley
    return _.transform(obj, (result: { [name: string]: unknown }, value, key: string | number) => {
      if (typeof key == 'string') {
        const lowerKey: string = key.toLowerCase();
        // transform to a new object
        for (const checkKey of keysToOmit) {
          // if the key is in the index skip it
          if (lowerKey.includes(checkKey)) {
            return;
          }
        }
      }
      // if the key is an object run it through the inner function - omitFromObject
      result[key] = _.isObject(value) ? this.deepOmit(value, keysToOmit) : value;
    });
  }
}
