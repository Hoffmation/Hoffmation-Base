/**
 *
 */
export interface iWaterSensor {
  /**
   *
   */
  water: boolean;

  /**
   *
   */
  stopAlarm(quiet: boolean, timeout: number): void;
}
