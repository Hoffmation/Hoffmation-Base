/**
 * One persisted battery level reading, as it is stored alongside each energy calculation interval.
 */
export interface iBatteryLevelSample {
  /**
   * State of charge in percent (0-100)
   */
  level: number;
  /**
   * The date of the reading
   */
  date: Date;
}
