import { Daytime } from './daytime';

export class TemperaturSettings {
  public constructor(
    public start: Daytime,
    public end: Daytime,
    public temperatur: number,
    public active: boolean = true,
  ) {}

  public isNowInRange(date: Date): boolean {
    const now: number = date.getTime();
    const todayStart: number = new Date(now).setHours(this.start.hour, this.start.minute);
    if (now < todayStart) {
      return false;
    }

    const todayEnd: number = new Date(now).setHours(this.end.hour, this.end.minute);

    return now < todayEnd;
  }

  public static getActiveSetting(
    settings: { [name: string]: TemperaturSettings },
    date: Date,
  ): TemperaturSettings | undefined {
    for (const name of Object.keys(settings)) {
      if (settings[name] === undefined) {
        continue;
      }

      const setting: TemperaturSettings = settings[name];
      if (setting.isNowInRange(date)) {
        return setting;
      }
    }
  }
}
