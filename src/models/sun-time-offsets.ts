import { iSunTimeOffsets } from '../interfaces';

export class SunTimeOffsets implements iSunTimeOffsets {
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
