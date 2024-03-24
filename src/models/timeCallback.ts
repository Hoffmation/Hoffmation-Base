import { ServerLogService, SunTimeOffsets, TimeCallbackService, Utils } from '../server';
import { LogLevel } from './logLevel';

export enum TimeCallbackType {
  TimeOfDay = 1,
  Sunrise = 2,
  SunSet = 3,
}

export enum TimeOfDay {
  BeforeSunrise = 1,
  Daylight = 2,
  AfterSunset = 3,
  Night = 4,
}

export class TimeCallback {
  private _calculationSunrise?: Date;

  public get calculationSunrise(): Date {
    return this._calculationSunrise ?? TimeCallbackService.nextSunRise;
  }

  /**
   * The date this Callback was last fired
   */
  public lastDone: Date = new Date(0);
  /**
   * The calculated date when this callback should be fired next
   * @warning This might have not yet been recalculated
   */
  public nextToDo?: Date;

  private _calculationSunset?: Date;

  public get calculationSunset(): Date {
    return this._calculationSunset ?? TimeCallbackService.nextSunSet;
  }

  constructor(
    public name: string,
    public type: TimeCallbackType,
    private cFunction: () => void,
    public minuteOffset: number,
    public hours?: number,
    public minutes?: number,
    public sunTimeOffset?: SunTimeOffsets,
    // Additional Offset due to amount of clouds
    public cloudOffset?: number,
  ) {}

  public recalcNextToDo(now: Date): void {
    const today: Date = new Date(now.getTime());
    today.setHours(0, 0, 0, 0);
    let nextCalculatedTime: Date;
    switch (this.type) {
      case TimeCallbackType.TimeOfDay:
        // !!WARNING!! Changing to winter time, that day has 25 hours.
        if (this.hours === undefined) {
          this.hours = 0;
        }

        if (this.minutes === undefined) {
          this.minutes = 0;
        }

        nextCalculatedTime = Utils.nextMatchingDate(this.hours, this.minutes + this.minuteOffset);
        break;
      case TimeCallbackType.Sunrise:
        if (this.cloudOffset === undefined) {
          this.cloudOffset = 0;
        }
        if (this.nextToDo === undefined || this.lastDone.getDate() === this.calculationSunrise.getDate()) {
          this._calculationSunrise = new Date(TimeCallbackService.nextSunRise.getTime());
        }
        nextCalculatedTime = new Date(
          this.calculationSunrise.getTime() + (this.minuteOffset + this.cloudOffset) * 60 * 1000,
        );
        if (this.sunTimeOffset) {
          const nextMinSR: Date = this.sunTimeOffset.getNextMinimumSunrise(now);
          if (nextMinSR > nextCalculatedTime && nextCalculatedTime.getDate() === nextMinSR.getDate()) {
            nextCalculatedTime = nextMinSR;
          }
        }
        if (
          TimeCallbackService.startTime > nextCalculatedTime &&
          now.getTime() > TimeCallbackService.nextSunSet.getTime() - 3600000
        ) {
          // This combination is typical for a system restart at evening
          return;
        }
        break;
      case TimeCallbackType.SunSet:
        if (this.nextToDo === undefined || this.lastDone.getDate() === this.calculationSunset.getDate()) {
          this._calculationSunset = new Date(TimeCallbackService.nextSunSet.getTime());
        }
        if (this.cloudOffset === undefined) {
          this.cloudOffset = 0;
        } else {
          this.cloudOffset = this.cloudOffset * -1;
        }
        nextCalculatedTime = new Date(
          this.calculationSunset.getTime() + (this.minuteOffset + this.cloudOffset) * 60 * 1000,
        );
        if (this.sunTimeOffset) {
          const nextMaxSS: Date = this.sunTimeOffset.getNextMaximumSunset(now);
          if (nextMaxSS < nextCalculatedTime && nextCalculatedTime.getDate() === nextMaxSS.getDate()) {
            nextCalculatedTime = nextMaxSS;
          }
        }
        break;
    }
    if (nextCalculatedTime < now && this.nextToDo && this.nextToDo > now) {
      ServerLogService.writeLog(
        LogLevel.Info,
        'Time Callback recalc results in the past, while previous target is still in future --> fire immediately.',
      );
      this.perform(now);
      return;
    }
    if (this.nextToDo?.getTime() == nextCalculatedTime.getTime()) {
      // No change
      return;
    }
    this.nextToDo = nextCalculatedTime;
    ServerLogService.writeLog(
      LogLevel.Debug,
      `Next Time event for "${this.name}" at ${this.nextToDo.toLocaleString('de-DE')}`,
    );
  }

  public perform(now: Date = new Date()): void {
    ServerLogService.writeLog(LogLevel.Debug, `Timecallback '${this.name}' fired`);
    this.cFunction();
    this.lastDone = now;
    this.nextToDo = undefined;
    this._calculationSunrise = undefined;
    this._calculationSunset = undefined;
  }
}
