import { LogLevel } from './logLevel';
import { ServerLogService } from '../server/services/log-service';
import { SunTimeOffsets, TimeCallbackService } from '../server/services/time-callback-service';

export class TimeCallback {
  public lastDone: Date = new Date(0);
  public nextToDo?: Date;

  constructor(
    public name: string,
    public type: TimeCallbackType,
    public cFunction: () => void,
    public minuteOffset: number,
    public hours?: number,
    public minutes?: number,
    public sunTimeOffset?: SunTimeOffsets,
  ) {}

  public recalcNextToDo(now: Date): void {
    const today: Date = new Date(now.getTime());
    today.setHours(0, 0, 0, 0);
    switch (this.type) {
      case TimeCallbackType.TimeOfDay:
        if (this.hours === undefined) {
          this.hours = 0;
        }

        if (this.minutes === undefined) {
          this.minutes = 0;
        }

        this.nextToDo = new Date(
          today.getTime() + this.hours * 60 * 60 * 1000 + (this.minutes + this.minuteOffset) * 60 * 1000,
        );

        if (this.nextToDo < now) {
          // Heute ist schon abgelaufen, also morgen festlegen
          this.nextToDo = new Date(this.nextToDo.getTime() + 24 * 60 * 60 * 1000);
        }

        ServerLogService.writeLog(
          LogLevel.Trace,
          `Nächste Zeitevent für "${this.name}" um ${this.nextToDo.toLocaleTimeString('de-DE')}`,
        );
        break;
      case TimeCallbackType.Sunrise:
        let fixedSRDate: Date = new Date(TimeCallbackService.nextSunRise.getTime() + this.minuteOffset * 60 * 1000);
        if (this.sunTimeOffset) {
          const nextMinSR: Date = this.sunTimeOffset.getNextMinimumSunrise();
          if (nextMinSR > fixedSRDate && fixedSRDate.getDate() === nextMinSR.getDate()) {
            fixedSRDate = nextMinSR;
          }
        }
        if (now > fixedSRDate) {
          return;
        }

        ServerLogService.writeLog(
          LogLevel.Trace,
          `Nächste Zeitevent für "${this.name}" um ${fixedSRDate.toLocaleTimeString('de-DE')}`,
        );
        this.nextToDo = fixedSRDate;
        break;
      case TimeCallbackType.SunSet:
        let fixedSSDate: Date = new Date(TimeCallbackService.nextSunSet.getTime() + this.minuteOffset * 60 * 1000);
        if (this.sunTimeOffset) {
          const nextMaxSS: Date = this.sunTimeOffset.getNextMaximumSunset();
          if (nextMaxSS < fixedSSDate && fixedSSDate.getDate() === nextMaxSS.getDate()) {
            fixedSSDate = nextMaxSS;
          }
        }
        if (now > fixedSSDate) {
          return;
        }

        ServerLogService.writeLog(
          LogLevel.Trace,
          `Nächste Zeitevent für "${this.name}" um ${fixedSSDate.toLocaleTimeString('de-DE')}`,
        );
        this.nextToDo = fixedSSDate;
        break;
    }
  }
}

export enum TimeCallbackType {
  TimeOfDay = 1,
  Sunrise = 2,
  SunSet = 3,
}
