import { ServerLogService } from '../log-service';
import { LogLevel } from '../../../models';
import _ from 'lodash';
import { Res } from '../Translation';
import { iPersist } from '../dbo';
import { SettingsService } from '../settings-service';

export const DAYMS: number = 24 * 60 * 60 * 1000;

export class Utils {
  public static dbo: iPersist | undefined;

  public static get anyDboActive(): boolean {
    return SettingsService.settings.persistence?.postgreSql !== undefined;
  }

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

  public static jsonFilter(object: object, additionalOmitKeys: string[] = []): Partial<object> {
    const keysToOmit: string[] = ['timeout', 'interval', 'timeouts', 'callback', 'otaInfo'];
    keysToOmit.push(...additionalOmitKeys);
    return this.deepOmit(object, keysToOmit);
  }

  public static testInitializeServices(): void {
    ServerLogService.settings.logLevel = -1;
    SettingsService.initialize({
      ioBrokerUrl: '',
      timeSettings: {
        nightEnd: {
          hours: 7,
          minutes: 30,
        },
        nightStart: {
          hours: 23,
          minutes: 30,
        },
      },
      translationSettings: {
        language: 'en',
      },
      roomDefault: {
        rolloHeatReduction: true,
        roomIsAlwaysDark: false,
        lampenBeiBewegung: true,
        lichtSonnenAufgangAus: true,
        sonnenUntergangRollos: true,
        sonnenAufgangRollos: true,
        movementResetTimer: 240,
        sonnenUntergangRolloDelay: 15,
        sonnenUntergangLampenDelay: 15,
        sonnenUntergangRolloMaxTime: {
          hours: 21,
          minutes: 30,
        },
        sonnenAufgangRolloMinTime: {
          hours: 7,
          minutes: 30,
        },
        sonnenAufgangRolloDelay: 35,
        sonnenAufgangLampenDelay: 15,
        sonnenUntergangRolloAdditionalOffsetPerCloudiness: 0.25,
        lightIfNoWindows: false,
        ambientLightAfterSunset: false,
      },
    });
    Res.initialize(SettingsService.settings.translationSettings);
  }

  public static kWh(wattage: number, durationInMs: number): number {
    return (wattage * durationInMs) / 3600000000.0;
  }

  public static round(number: number, digits: number): number {
    const factor: number = Math.pow(10, digits);
    return Math.round(number * factor) / factor;
  }

  public static roundDot5(number: number): number {
    const x: number = Math.round(number * 10);
    const roundToClosest5: number = x % 5 >= 2.5 ? Math.floor(x / 5) * 5 + 5 : Math.floor(x / 5) * 5;
    return roundToClosest5 / 10;
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

  public static dateByTimeSpan(hours: number, minutes: number, now: Date = new Date()): Date {
    return new Date(new Date(now).setHours(hours, minutes));
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

  private static deepOmit(obj: object, keysToOmit: string[], level: number = 1, currentKey: string = ''): object {
    if (level > 10 && level < 20) {
      ServerLogService.writeLog(LogLevel.Warn, `DeepOmit Loop Level ${level} reached for ${currentKey}`);
    }
    // the inner function which will be called recursivley
    return _.transform(obj, (result: { [name: string]: unknown }, value, key: string | number) => {
      if (value === undefined || value === null) {
        return;
      }
      if (typeof key == 'string') {
        const lowerKey: string = key.toLowerCase();
        // transform to a new object
        for (const checkKey of keysToOmit) {
          // if the key is in the index skip it
          if (lowerKey.includes(checkKey.toLowerCase())) {
            return;
          }
        }
        if (lowerKey.endsWith('map')) {
          const newKey: string = lowerKey.replace('map', 'dict');
          const dict: { [key: string | number]: unknown } = {};
          const map: Map<string | number, unknown> = value as Map<string, unknown>;
          if (typeof map.keys !== 'function') {
            ServerLogService.writeLog(LogLevel.Error, `Map ${currentKey}.${lowerKey} is not a map`);
            return;
          }
          for (const mapName of map.keys()) {
            dict[mapName] = _.isObject(map.get(mapName))
              ? this.deepOmit(map.get(mapName) as object, keysToOmit, level + 1, `${currentKey}.${lowerKey}.${mapName}`)
              : map.get(mapName);
          }
          result[newKey] = dict;
          return;
        }
      }
      if (typeof (value as Date).getMonth === 'function') {
        result[key] = (value as Date).getTime();
        return;
      }
      // if the key is an object run it through the inner function - omitFromObject
      result[key] = _.isObject(value) ? this.deepOmit(value, keysToOmit, level + 1, `${currentKey}.${key}`) : value;
    });
  }

  public static nextMatchingDate(hours: number = 0, minutes: number = 0, now: Date = new Date()): Date {
    const todayOption: Date = new Date(now.getTime());
    todayOption.setHours(hours, minutes, 0, 0);

    if (todayOption > now) {
      // Today Option is in the future --> valid
      return todayOption;
    }

    const todayMidnight: Date = new Date(now.getTime());
    todayMidnight.setHours(0, 0, 0, 0);
    // 26 to guarantee matching next day even with time changes
    const tomorowOption: Date = new Date(todayMidnight.getTime() + 26 * 60 * 60 * 1000);
    tomorowOption.setHours(hours, minutes, 0, 0);

    return tomorowOption;
  }

  public static timeWithinBorders(
    minimumHours: number,
    minimumMinutes: number,
    maxHours: number,
    maxMinutes: number,
    now: Date = new Date(),
  ): boolean {
    if ((minimumHours != 0 || minimumMinutes != 0) && now < Utils.dateByTimeSpan(minimumHours, minimumMinutes, now)) {
      return false;
    } else if ((maxHours != 0 || maxMinutes != 0) && now > Utils.dateByTimeSpan(maxHours, maxMinutes, now)) {
      return false;
    }
    return true;
  }
}
