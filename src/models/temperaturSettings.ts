import { Daytime } from 'index';

export class TemperaturSettings {
  public constructor(
    public start: Daytime,
    public end: Daytime,
    public temperatur: number,
    public active: boolean = true,
  ) {}

  public isNowInRange(): boolean {
    const now: number = new Date().getTime();
    const todayStart: number = new Date().setHours(this.start.hour, this.start.minute);
    if (now < todayStart) {
      return false;
    }

    const todayEnd: number = new Date().setHours(this.end.hour, this.end.minute);

    return now < todayEnd;
  }
}
