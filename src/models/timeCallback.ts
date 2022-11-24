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
  public lastDone: Date = new Date(0);
  public nextToDo?: Date;

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
    switch (this.type) {
      case TimeCallbackType.TimeOfDay:
        // !!WARNING!! Changing to winter time, that day has 25 hours.
        if (this.hours === undefined) {
          this.hours = 0;
        }

        if (this.minutes === undefined) {
          this.minutes = 0;
        }

        this.nextToDo = Utils.nextMatchingDate(this.hours, this.minutes + this.minuteOffset);

        ServerLogService.writeLog(
          LogLevel.Debug,
          `Next Time event for "${this.name}" at ${this.nextToDo.toLocaleString('de-DE')}`,
        );
        break;
      case TimeCallbackType.Sunrise:
        if (this.cloudOffset === undefined) {
          this.cloudOffset = 0;
        }
        let fixedSRDate: Date = new Date(
          TimeCallbackService.nextSunRise.getTime() + (this.minuteOffset + this.cloudOffset) * 60 * 1000,
        );
        if (this.sunTimeOffset) {
          const nextMinSR: Date = this.sunTimeOffset.getNextMinimumSunrise(now);
          if (nextMinSR > fixedSRDate && fixedSRDate.getDate() === nextMinSR.getDate()) {
            fixedSRDate = nextMinSR;
          }
        }
        if (now > fixedSRDate) {
          return;
        }

        ServerLogService.writeLog(
          LogLevel.Debug,
          `Next Time Event for "${this.name}" at ${fixedSRDate.toLocaleTimeString('de-DE')}`,
        );
        this.nextToDo = fixedSRDate;
        break;
      case TimeCallbackType.SunSet:
        if (this.cloudOffset === undefined) {
          this.cloudOffset = 0;
        } else {
          this.cloudOffset = this.cloudOffset * -1;
        }
        let fixedSSDate: Date = new Date(
          TimeCallbackService.nextSunSet.getTime() + (this.minuteOffset + this.cloudOffset) * 60 * 1000,
        );
        if (this.sunTimeOffset) {
          const nextMaxSS: Date = this.sunTimeOffset.getNextMaximumSunset(now);
          if (nextMaxSS < fixedSSDate && fixedSSDate.getDate() === nextMaxSS.getDate()) {
            fixedSSDate = nextMaxSS;
          }
        }
        if (now > fixedSSDate) {
          return;
        }

        ServerLogService.writeLog(
          LogLevel.Debug,
          `Next Time Event for "${this.name}" at ${fixedSSDate.toLocaleTimeString('de-DE')}`,
        );
        this.nextToDo = fixedSSDate;
        break;
    }
  }

  public perform(): void {
    ServerLogService.writeLog(LogLevel.Debug, `Timecallback '${this.name}' fired`);
    this.cFunction();
  }
}
