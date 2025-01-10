import { iDaytime, iTemperatureSettings } from '../interfaces';

export class TemperatureSettings implements iTemperatureSettings {
  public constructor(
    public start: iDaytime,
    public end: iDaytime,
    public temperature: number,
    public name: string,
    public active: boolean = true,
  ) {}

  public static getActiveSetting(settings: iTemperatureSettings[], date: Date): iTemperatureSettings | undefined {
    for (const setting of settings) {
      if (TemperatureSettings.isNowInRange(setting, date)) {
        return setting;
      }
    }
  }

  public static isNowInRange(setting: iTemperatureSettings, date: Date): boolean {
    const now: number = date.getTime();
    const todayStart: number = new Date(now).setHours(setting.start.hour, setting.start.minute);
    if (now < todayStart) {
      return false;
    }

    const todayEnd: number = new Date(now).setHours(setting.end.hour, setting.end.minute);

    return now < todayEnd;
  }
}
