import { Daytime } from './daytime';

export class TemperatureSettings {
  public constructor(
    public start: Daytime,
    public end: Daytime,
    public temperature: number,
    public name: string,
    public active: boolean = true,
  ) {}

  public static getActiveSetting(settings: TemperatureSettings[], date: Date): TemperatureSettings | undefined {
    for (const setting of settings) {
      if (TemperatureSettings.isNowInRange(setting, date)) {
        return setting;
      }
    }
  }

  public static isNowInRange(setting: TemperatureSettings, date: Date): boolean {
    const now: number = date.getTime();
    const todayStart: number = new Date(now).setHours(setting.start.hour, setting.start.minute);
    if (now < todayStart) {
      return false;
    }

    const todayEnd: number = new Date(now).setHours(setting.end.hour, setting.end.minute);

    return now < todayEnd;
  }
}
