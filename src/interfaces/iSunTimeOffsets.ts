export interface iSunTimeOffsets {
  sunrise: number;
  sunset: number;
  minimumHours: number;
  minimumMinutes: number;
  maximumHours: number;
  maximumMinutes: number;

  getNextMinimumSunrise(date: Date): Date;

  getNextMaximumSunset(date: Date): Date;
}
