import { getSunrise, getSunset } from 'sunrise-sunset-js';
import { LogLevel, TimeCallback, TimeCallbackType, TimeOfDay } from '../../models';
import { ServerLogService } from './log-service';
import { Utils } from './utils';
import { iTimePair } from '../config';
import { SettingsService } from './settings-service';
import { Devices } from '../devices';

export class SunTimeOffsets {
  public constructor(
    public sunrise: number = 0,
    public sunset: number = 0,
    public minimumHours: number = 6,
    public minimumMinutes: number = 24,
    public maximumHours: number = 22,
    public maximumMinutes: number = 30,
  ) {}

  public getNextMinimumSunrise(date: Date = new Date()): Date {
    const dateCopy: Date = new Date(date);
    const today: Date = new Date(dateCopy.setHours(this.minimumHours, this.minimumMinutes, 0, 0));
    if (today > date) {
      return today;
    }
    return new Date(today.setDate(today.getDate() + 1));
  }

  public getNextMaximumSunset(date: Date = new Date()): Date {
    const dateCopy: Date = new Date(date);
    const today = new Date(dateCopy.setHours(this.maximumHours, this.maximumMinutes, 0, 0));
    if (today > date) {
      return today;
    }
    return new Date(today.setDate(today.getDate() + 1));
  }
}

export class TimeCallbackService {
  private static _startTime: Date;

  private static _todaySunRise: Date;
  private static _todaySunSet: Date;
  private static _callbacks: Map<string, TimeCallback> = new Map<string, TimeCallback>();
  private static _iCheckTimeout: NodeJS.Timeout | undefined;
  private static _lastCheck: Date = new Date(0);

  private static _nextSunRise: Date;

  public static get startTime(): Date {
    return this._startTime;
  }

  public static get nextSunRise(): Date {
    return TimeCallbackService._nextSunRise;
  }

  private static _nextSunSet: Date;

  public static get nextSunSet(): Date {
    return TimeCallbackService._nextSunSet;
  }

  public static dayType(pOffset: SunTimeOffsets, now: Date = new Date()): TimeOfDay {
    const hours = now.getHours();
    const minutes = now.getMinutes();

    const nightEnd: iTimePair = SettingsService.settings.timeSettings.nightEnd;
    const nightStart: iTimePair = SettingsService.settings.timeSettings.nightStart;

    if (nightStart.hours < nightEnd.hours) {
      if (
        (hours < nightEnd.hours && hours > nightStart.hours) ||
        (hours === nightEnd.hours && minutes < nightEnd.minutes) ||
        (hours === nightStart.hours && minutes > nightStart.minutes)
      ) {
        return TimeOfDay.Night;
      }
    } else {
      if (
        hours > nightStart.hours ||
        hours < nightEnd.hours ||
        (hours === nightStart.hours && minutes >= nightStart.minutes) ||
        (hours === nightEnd.hours && minutes <= nightEnd.minutes)
      ) {
        return TimeOfDay.Night;
      }
    }

    let sunset: Date = new Date(TimeCallbackService._todaySunSet.getTime() + pOffset.sunset * 60 * 1000);
    const maximumSunset: Date = pOffset.getNextMaximumSunset(now);
    if (maximumSunset.getDate() !== sunset.getDate()) {
      maximumSunset.setDate(maximumSunset.getDate() - 1);
    }
    if (maximumSunset < sunset && maximumSunset.getDate() === sunset.getDate()) {
      ServerLogService.writeLog(
        LogLevel.Trace,
        `Maximum Sunset vor nächstem Sunset: Sunset ${sunset.toLocaleString()}\t\t${maximumSunset.toLocaleString()}`,
      );
      sunset = maximumSunset;
    }
    if (now > sunset) {
      return TimeOfDay.AfterSunset;
    }
    const minimumSunrise: Date = pOffset.getNextMinimumSunrise(now);
    let sunrise: Date = new Date(TimeCallbackService._todaySunRise.getTime() + pOffset.sunrise * 60 * 1000);
    if (minimumSunrise.getDate() !== sunrise.getDate()) {
      minimumSunrise.setDate(minimumSunrise.getDate() - 1);
    }
    if (minimumSunrise > sunrise && minimumSunrise.getDate() === sunrise.getDate()) {
      ServerLogService.writeLog(
        LogLevel.Trace,
        `Minimum Sunset nach aktuellem Sunrise: Sunset ${sunrise.toLocaleString()}\t\t${minimumSunrise.toLocaleString()}`,
      );
      sunrise = minimumSunrise;
    }
    if (now < sunrise && now.getDate() == sunrise.getDate()) {
      return TimeOfDay.BeforeSunrise;
    }
    return TimeOfDay.Daylight;
  }

  public static darkOutsideOrNight(dayType: TimeOfDay): boolean {
    switch (dayType) {
      case TimeOfDay.Night:
      case TimeOfDay.BeforeSunrise:
      case TimeOfDay.AfterSunset:
        return true;
      default:
        return false;
    }
  }

  public static stopInterval(): void {
    if (this._iCheckTimeout !== undefined) {
      clearInterval(this._iCheckTimeout);
      this._iCheckTimeout = undefined;
    }
  }

  public static init(startTime: Date = new Date()): void {
    this._startTime = startTime;
    const dailyRecalc: TimeCallback = new TimeCallback(
      'Midnight Recalc',
      TimeCallbackType.TimeOfDay,
      () => {
        TimeCallbackService.recalcSunTimes();
        Devices.midnightReset();
      },
      0,
      0,
      0,
    );

    const daily3oClockRecalc: TimeCallback = new TimeCallback(
      'Daily3oClockRecalc',
      TimeCallbackType.TimeOfDay,
      () => {
        Devices.resetDetectionsToday();
      },
      0,
      3,
      0,
    );

    TimeCallbackService.recalcSunTimes();
    TimeCallbackService.addCallback(dailyRecalc);
    TimeCallbackService.addCallback(daily3oClockRecalc);
    this._iCheckTimeout = Utils.guardedInterval(TimeCallbackService.performCheck.bind(this), 60000);
  }

  public static addCallback(pCallback: TimeCallback): void {
    if (TimeCallbackService._callbacks.has(pCallback.name)) {
      ServerLogService.writeLog(LogLevel.Info, `Overwriting existing TimeCallback "${pCallback.name}"`);
    }
    TimeCallbackService._callbacks.set(pCallback.name, pCallback);
  }

  public static performCheck(): void {
    ServerLogService.writeLog(LogLevel.Trace, "Perform TimeCallBackCheck");
    const now: Date = new Date();
    for (const tc of TimeCallbackService._callbacks.values()) {
      if (tc.nextToDo === undefined || tc.nextToDo < tc.lastDone) {
        tc.recalcNextToDo(now);
      }

      if (tc.nextToDo === undefined) {
        continue;
      }

      if (tc.nextToDo < now && tc.nextToDo > TimeCallbackService._lastCheck) {
        tc.perform(now);
      }
    }

    if (TimeCallbackService._nextSunRise < now) {
      const tomorrow: Date = new Date(new Date().setHours(2, 0, 0, 0) + 24 * 60 * 60 * 1000);
      TimeCallbackService.updateSunRise(tomorrow);
    }
    if (TimeCallbackService._nextSunSet < now) {
      const tomorrow: Date = new Date(new Date().setHours(2, 0, 0, 0) + 24 * 60 * 60 * 1000);
      TimeCallbackService.updateSunSet(tomorrow);
    }

    TimeCallbackService._lastCheck = now;
  }

  public static recalcSunTimes(calculationDate: Date = new Date()): void {
    TimeCallbackService._todaySunRise = getSunrise(
      SettingsService.latitude,
      SettingsService.longitude,
      calculationDate,
    );

    TimeCallbackService._todaySunSet = getSunset(SettingsService.latitude, SettingsService.longitude, calculationDate);
    TimeCallbackService.updateSunSet();
    TimeCallbackService.updateSunRise();
    ServerLogService.writeLog(
      LogLevel.Info,
      `Today Sunrise: ${TimeCallbackService._todaySunRise.toLocaleString('de-DE')}
Today Sunset: ${TimeCallbackService._todaySunSet.toLocaleString('de-DE')}
Next Sunrise: ${TimeCallbackService._nextSunRise.toLocaleString('de-DE')}
Next Sunset: ${TimeCallbackService._nextSunSet.toLocaleString('de-DE')}`,
    );
  }

  public static removeCallback(pCallback: TimeCallback): void {
    if (TimeCallbackService._callbacks.has(pCallback.name)) {
      TimeCallbackService._callbacks.delete(pCallback.name);
    } else {
      ServerLogService.writeLog(LogLevel.Info, `TimeCallback to remove ("${pCallback.name}") doesn't exist.`);
    }
  }

  public static updateSunRise(pDay: Date = new Date(), lat?: number, long?: number): void {
    TimeCallbackService._nextSunRise = getSunrise(
      lat ?? SettingsService.latitude,
      long ?? SettingsService.longitude,
      pDay,
    );
  }

  public static updateSunSet(pDay: Date = new Date(), lat?: number, long?: number): void {
    TimeCallbackService._nextSunSet = this.getSunsetForDate(
      pDay,
      lat ?? SettingsService.latitude,
      long ?? SettingsService.longitude,
    );
  }

  public static getSunsetForDate(pDay: Date = new Date(), lat?: number, long?: number): Date {
    return getSunset(lat ?? SettingsService.latitude, long ?? SettingsService.longitude, pDay);
  }

  public static hoursTilSunset(): number {
    return (this.nextSunSet.getTime() - Utils.nowMS()) / 1000 / 60;
  }
}
